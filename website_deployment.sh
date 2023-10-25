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
no_discovery="true"
no_pull="true"
clean_images_cron="0 3 * * * docker rmi \$(docker images | grep -E 'mintter/mintter-site|mintter/sitegw' | awk '{print \$3}') # mintter site cleanup"

usage()
{
    echo "group_deployment script. It links a group [options] hostname"
	echo "   hostname          :Protocol + domain this sice will be served in. Ex.: https://example.com"
    echo "Options"
	echo  "-t --tag T          :Image tag to pull. Latest by default"
	echo  "-g --gateway        :Site behaves as a gateway, storing all data. False by default."
	echo  "-a --auto-update    :Updates containers whenever a new image is available. Disabled by default"
    echo  "-h --help           :Shows help and exit"
}

while [ "$1" != "" ]; do
    case $1 in
        -h | --help )           usage
                                exit
                                ;;
        -a | --auto-update )    auto_update=1
                                ;;
        -g | --gateway )        no_discovery="false"
                                no_pull="false"
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

mkdir -p ${workspace}
rm -f ${workspace}/deployment.log
touch ${workspace}/deployment.log

install_docker
curl -s -o ${workspace}/mttsite.yml https://raw.githubusercontent.com/mintterteam/mintter/main/docker-compose.yml
docker stop nextjs minttersite proxy 2> ${workspace}/deployment.log 1> ${workspace}/deployment.log || true
docker rm nextjs minttersite proxy 2> ${workspace}/deployment.log 1> ${workspace}/deployment.log || true

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
	path /.well-known/version
}

reverse_proxy @wellknown minttersite:{\$MTT_SITE_BACKEND_GRPCWEB_PORT:56001}

route @version {
    rewrite /.well-known/version /debug/buildinfo
    reverse_proxy minttersite:{\$MTT_SITE_BACKEND_GRPCWEB_PORT:56001}
}

reverse_proxy @ipfsget minttersite:{\$MTT_SITE_BACKEND_GRPCWEB_PORT:56001}

reverse_proxy * nextjs:{\$MTT_SITE_LOCAL_PORT:3000}
BLOCK

if [ $auto_update -eq 1 ]; then
  docker rm -f autoupdater >/dev/null 2>&1
  if ! (crontab -l 2>/dev/null || true) | grep -q "mintter site cleanup"; then
    # Remove any existing cron job for this task, add the new cron job, and install the new crontab
    { crontab -l 2>/dev/null || true; echo "$clean_images_cron"; } | crontab -
  fi
  docker run -d --name autoupdater -v /var/run/docker.sock:/var/run/docker.sock containrrr/watchtower -i 300 nextjs minttersite >/dev/null 2>&1
fi

MTT_SITE_DNS="$dns" MTT_SITE_TAG="$tag" MTT_SITE_NO_DISCOVERY="$no_discovery" MTT_SITE_NO_PULL="$no_pull" MTT_SITE_HOSTNAME="$hostname" MTT_SITE_PROXY_CONTAINER_NAME="proxy" MTT_SITE_NEXTJS_CONTAINER_NAME="nextjs" MTT_SITE_DAEMON_CONTAINER_NAME="minttersite" docker compose -f ${workspace}/mttsite.yml up -d --pull always --quiet-pull 2> ${workspace}/deployment.log || true
# MTT_SITE_DNS="$dns" MTT_SITE_HOSTNAME="$hostname" MTT_SITE_PROXY_CONTAINER_NAME="proxy" MTT_SITE_NEXTJS_CONTAINER_NAME="nextjs" MTT_SITE_DAEMON_CONTAINER_NAME="minttersite" docker compose -f ${workspace}/mttsite.yml up -d --pull always --quiet-pull 2> ${workspace}/deployment.log || true

timeout 15 docker logs -f minttersite 2> /dev/null | sed '/Site Invitation secret token: / q' | awk -F ': ' '{print $2}'

rm ${workspace}/mttsite.yml
exit 0
