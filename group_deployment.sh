#!/bin/sh
set -e

command_exists() {
	command -v "$@" > /dev/null 2>&1
}

get_distribution() {
	lsb_dist=""
	# Every system that we officially support has /etc/os-release
	if [ -r /etc/os-release ]; then
			lsb_dist="$(. /etc/os-release && echo "$ID")"
	fi
	# Returning an empty string here should be alright since the
	# case statements don't act unless you provide an actual value
	echo "$lsb_dist"
}

install_docker() {
	if ! command_exists docker; then
      if [ $userid -ne 0 ]; then
        echo "please run the script as root to install docker"
        exit 1
      fi
      echo "It seems that you don't have docker installed, we will install it now."
      curl -fsSL https://get.docker.com -o get-docker.sh
      sh get-docker.sh --dry-run
      read -p "Are you ok to install the above commands (y/n)?" install
      if [ "$install" = "y" ]; then
        sh get-docker.sh
        rm get-docker.sh
      else
        rm get-docker.sh
        echo "Ok, install docker and docker compose manually and execute this script again."
        exit 0
      fi
    fi
    if ! command_exists docker compose; then
      if [ $userid -ne 0 ]; then
        echo "please run the script as root to install docker compose."
        exit 1
      fi
      echo "We need to install docker compose plugin. Downloading..."
      case "$lsb_dist" in
        ubuntu)
          mkdir -p ${HOME}/.docker/cli-plugins/
          curl -sSL https://github.com/docker/compose/releases/download/v2.16.0/docker-compose-linux-x86_64 -o ${HOME}/.docker/cli-plugins/docker-compose
          chmod +x ${HOME}/.docker/cli-plugins/docker-compose
        ;;

        debian|raspbian)
          curl -sL https://github.com/docker/compose/releases/download/2.16.0/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose
          chmod +x /usr/local/bin/docker-compose
        ;;

        centos|rhel|sles)
          curl -sL "https://github.com/docker/compose/releases/download/2.16.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
          chmod +x /usr/local/bin/docker-compose
        ;;

        *)
          echo "Could not install docker compose for $lsb_dist distro. Please, install it manually."
          exit 1
        ;;

      esac
      
    fi
}
userid=$(id -u)
lsb_dist=$( get_distribution )
lsb_dist="$(echo "$lsb_dist" | tr '[:upper:]' '[:lower:]')"

workspace="${HOME}/.mtt-site"

usage()
{
    echo group_deployment script. It links a group [options]
    echo Options
	echo  "-h --hostname H     :domain where this site will be served. ex. https://example.com"
	echo  "-g --gid ID         :group ID to be linked to this deployment"
	echo  "-w --workspace PATH :path to install the site in. Default ${HOME}/.mtt-site"
	echo  "-e --extra F        :extra flags we want to pass to the daemon. Empty by default"
    echo  "--help              :shows help and exit"
}

while [ "$1" != "" ]; do
    case $1 in
        -h | --hostname )       shift
                                hostname=$1
                                ;;
		-w | --workspace )      shift
                                workspace=$1
                                ;;
        -e | --extra )          shift
								extra=$1
                                ;;
        --help )            	usage
                                exit 
                                ;;
        * )                     echo "param [$1] not valid. Run --help to see available params"
                                exit 1
    esac
    shift
done

if [ -z "$hostname" ]; then
  echo "Group Hostname flag (--hostname) must be provided"
  exit 1
fi

mkdir -p ${workspace}
rm -f ${workspace}/deployment.log
touch ${workspace}/deployment.log

install_docker
curl -s -o ${workspace}/mttsite.yml https://raw.githubusercontent.com/mintterteam/mintter/master/docker-compose-groups.yml
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
reverse_proxy @ipfsget minttersite:{\$MTT_SITE_BACKEND_GRPCWEB_PORT:56001}

reverse_proxy * nextjs:{\$MTT_SITE_LOCAL_PORT:3000}
BLOCK

MTT_SITE_DNS="$dns" MTT_SITE_HOSTNAME="$hostname" MTT_SITE_PROXY_CONTAINER_NAME="proxy" MTT_SITE_NEXTJS_CONTAINER_NAME="nextjs" MTT_SITE_DAEMON_CONTAINER_NAME="minttersite" docker compose -f ${workspace}/mttsite.yml up -d --pull always --quiet-pull 2> ${workspace}/deployment.log || true
# MTT_SITE_DNS="$dns" MTT_SITE_HOSTNAME="$hostname" MTT_SITE_PROXY_CONTAINER_NAME="proxy" MTT_SITE_NEXTJS_CONTAINER_NAME="nextjs" MTT_SITE_DAEMON_CONTAINER_NAME="minttersite" docker compose -f ${workspace}/mttsite.yml up -d --pull always --quiet-pull 2> ${workspace}/deployment.log || true
timeout 10 docker logs -f --tail 1 minttersite 2> /dev/null | sed '/Site Invitation secret token: / q' | awk -F ': ' '{print $2}'
rm ${workspace}/mttsite.yml
exit 0
