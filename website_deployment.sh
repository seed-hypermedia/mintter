#!/bin/sh
set -e

command_exists() {
	command -v "$@" > /dev/null 2>&1
}

install_docker() {
	if ! command_exists docker; then
		curl -fsSL https://get.docker.com -o install-docker.sh
		sh install-docker.sh
		rm install-docker.sh
	fi
}

userid=$(id -u)
workspace="${HOME}/.mtt-site"
hostname=""
tag="latest"
auto_update=0
profile=""
allow_push="false"
clean_images_cron="0 3 * * * docker rmi \$(docker images | grep -E 'seedhypermedia/site|hyper-media/gateway' | awk '{print \$3}') # seed site cleanup"

usage()
{
    echo "group_deployment script. It links a group [options] hostname"
	echo "   hostname          :Protocol + domain this sice will be served in. Ex.: https://example.com"
    echo "Options"
	echo  "-t --tag T          :Image tag to pull. Latest by default"
	echo  "-g --gateway        :Site behaves as a gateway, storing all data. False by default."
	echo  "-a --auto-update    :Updates containers whenever a new image is available. Disabled by default"
	echo  "-m --monitoring     :Sets up monitoring system"
    echo  "-h --help           :Shows help and exit"
}

while [ "$1" != "" ]; do
    case $1 in
        -h | --help )           usage
                                exit
                                ;;
        -a | --auto-update )    auto_update=1
                                ;;
        -m | --monitoring )     profile="metrics"
                                ;;
        -g | --gateway )        allow_push="true"
                                ;;
        -t | --tag )            shift
                                tag="$1"
                                ;;
        * )                     hostname="$1"
    esac
    shift
done

if [ -z "$hostname" ]; then
  echo "Please enter the hostname"
  exit 1
fi
hostname="${hostname%/}"
mkdir -p ${workspace}
rm -f ${workspace}/deployment.log
touch ${workspace}/deployment.log
curl -s -o ${workspace}/hmsite.yml https://raw.githubusercontent.com/MintterHypermedia/mintter/main/docker-compose.yml

install_docker
if [ -n "$profile" ]; then
	mkdir -p ${workspace}/monitoring/grafana/dashboards/libp2p
	mkdir -p ${workspace}/monitoring/grafana/dashboards/seed
	mkdir -p ${workspace}/monitoring/grafana/dashboards/system
	mkdir -p ${workspace}/monitoring/grafana/provisioning/dashboards
	mkdir -p ${workspace}/monitoring/grafana/provisioning/datasources
	mkdir -p ${workspace}/monitoring/prometheus
fi
docker stop nextjs hmsite proxy grafana prometheus 2> ${workspace}/deployment.log 1> ${workspace}/deployment.log || true
docker rm nextjs hmsite proxy grafana prometheus 2> ${workspace}/deployment.log 1> ${workspace}/deployment.log || true

dns=$(echo "MTT_SITE_HOSTNAME=${hostname}" | sed -n 's/.*MTT_SITE_HOSTNAME=http[s]*:\/\/\([^/]*\).*/\1/p')

mkdir -p ${workspace}/proxy

cat << BLOCK > ${workspace}/proxy/CaddyFile
{\$MTT_SITE_HOSTNAME}

@ipfsget {
	method GET HEAD OPTIONS
	path /ipfs/*
}

@wellknown {
	method GET HEAD OPTIONS
	path /.well-known/hypermedia-site
}

@version {
	method GET HEAD OPTIONS
	path /.well-known/hypermedia-site/version
}

reverse_proxy @wellknown hmsite:{\$HM_SITE_BACKEND_GRPCWEB_PORT:56001}

reverse_proxy /.metrics* grafana:{\$MTT_SITE_MONITORING_PORT:3001}

route @version {
    rewrite /.well-known/hypermedia-site/version /debug/version
    reverse_proxy hmsite:{\$HM_SITE_BACKEND_GRPCWEB_PORT:56001}
}

reverse_proxy @ipfsget hmsite:{\$HM_SITE_BACKEND_GRPCWEB_PORT:56001}

reverse_proxy * nextjs:{\$MTT_SITE_LOCAL_PORT:3000}
BLOCK

if [ $auto_update -eq 1 ]; then
  docker rm -f autoupdater >/dev/null 2>&1
  if ! (crontab -l 2>/dev/null || true) | grep -q "seed site cleanup"; then
    # Remove any existing cron job for this task, add the new cron job, and install the new crontab
    { crontab -l 2>/dev/null || true; echo "$clean_images_cron"; } | crontab -
  fi
  docker run -d --restart unless-stopped --name autoupdater -v /var/run/docker.sock:/var/run/docker.sock containrrr/watchtower --include-restarting -i 300 nextjs hmsite >/dev/null 2>&1
fi

MTT_SITE_DNS="$dns" MTT_SITE_TAG="$tag" MTT_SITE_ALLOW_PUSH="$allow_push" MTT_SITE_HOSTNAME="$hostname" MTT_SITE_PROXY_CONTAINER_NAME="proxy" MTT_SITE_NEXTJS_CONTAINER_NAME="nextjs" MTT_SITE_DAEMON_CONTAINER_NAME="hmsite" MTT_SITE_MONITORING_WORKDIR="${workspace}/monitoring" MTT_SITE_MONITORING_PORT="$MTT_SITE_MONITORING_PORT" docker compose -f ${workspace}/hmsite.yml --profile "$profile" up -d --pull always --quiet-pull 2> ${workspace}/deployment.log || true
# MTT_SITE_DNS="$dns" MTT_SITE_HOSTNAME="$hostname" MTT_SITE_PROXY_CONTAINER_NAME="proxy" MTT_SITE_NEXTJS_CONTAINER_NAME="nextjs" MTT_SITE_DAEMON_CONTAINER_NAME="hmsite" docker compose -f ${workspace}/hmsite.yml up -d --pull always --quiet-pull 2> ${workspace}/deployment.log || true

timeout 15 docker logs -f hmsite 2> /dev/null | sed '/Site Invitation secret token: / q' | awk -F ': ' '{print $2}'

rm -f ${workspace}/hmsite.yml
exit 0
