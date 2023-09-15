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

userid=$(id -u)
lsb_dist=$( get_distribution )
lsb_dist="$(echo "$lsb_dist" | tr '[:upper:]' '[:lower:]')"
cat << EOF
  __  __   _           _     _                      _____   _   _           
 |  \/  | (_)         | |   | |                    / ____| (_) | |          
 | \  / |  _   _ __   | |_  | |_    ___   _ __    | (___    _  | |_    ___  
 | |\/| | | | | '_ \  | __| | __|  / _ \ | '__|    \___ \  | | | __|  / _ \ 
 | |  | | | | | | | | | |_  | |_  |  __/ | |       ____) | | | | |_  |  __/ 
 |_|  |_| |_| |_| |_|  \__|  \__|  \___| |_|      |_____/  |_|  \__|  \___| 
                                                                            
EOF
echo "Welcome to the self hosted mintter site script!"
echo "We will ask questions to configure the site. Press enter after each response."
while :
do 
  # First ask the path and check if there is already an istallation 
  echo "1) Do you want to start/update a new site (ON) or turn off an existing one (OFF)?:"
  read turn
  if [ "$turn" = "ON" ] || [ "$turn" = "ADVANCED" ]; then
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
  elif [ "$turn" = "OFF" ]; then
    curl -s -o mttsite.yml https://raw.githubusercontent.com/mintterteam/mintter/master/docker-compose.yml
    MTT_SITE_NOWAIT_FLAG=-identity.no-account-wait docker compose -f mttsite.yml down
    rm mttsite.yml
    exit 0
  else
    echo "Please provide either ON or OFF"
    exit 1
  fi
  echo "2) Site workspace path? Leave blank for default (${HOME}/.mtt-site):"
  read workspace
  if [ -z "$workspace" ]
  then
    workspace="${HOME}/.mtt-site"
  fi
  if [ -d "$workspace" ] && [ -f "${workspace}/.env" ];then
    echo "We have already found a deployment in that folder with the following config:"
    while read -r line
    do
        echo "  - $line"
        if echo "$line" | grep -qE '^MTT_SITE_HOSTNAME='; then
            dns=$(echo "$line" | sed -n 's/.*MTT_SITE_HOSTNAME=http[s]*:\/\/\([^/]*\).*/\1/p')
        fi
    done < "${workspace}/.env"
    read -p "Do you want to use(u) those params or edit(e) them before update(u/e)?" response
    if [ "$response" = "u" ]; then
        mkdir -p ${workspace}/proxy
        curl -s -o mttsite.yml https://raw.githubusercontent.com/mintterteam/mintter/master/docker-compose.yml
        docker compose -f mttsite.yml down || true
        cat << BLOCK > ${workspace}/proxy/CaddyFile
{\$MTT_SITE_HOSTNAME}

@ipfsget {
	method GET HEAD OPTIONS
	path /ipfs/*
}
reverse_proxy @ipfsget minttersite:{\$MTT_SITE_BACKEND_GRPCWEB_PORT:56001}

reverse_proxy * nextjs:{\$MTT_SITE_LOCAL_PORT:3000}
BLOCK
        MTT_SITE_NOWAIT_FLAG=-identity.no-account-wait MTT_SITE_DNS="$dns" docker compose -f mttsite.yml --env-file ${workspace}/.env up -d --pull always --quiet-pull || true
        rm mttsite.yml
        exit 0
    fi
  fi
  while true; do
    echo "3) Site hostname. (Ex.:https://example.com or http://172.35.0.12):"
    read hostname
    if [ -z "$hostname" ]
    then
      echo "Please provide a valid hostname"
      continue
    fi
    https=$(expr substr ${hostname} 1 8)
    http=$(expr substr ${hostname} 1 7)
    if [ "$https" = "https://" ] || [ "$http" = "http://" ];then
      break
    else
      echo "Please make sure the hostname includes the protocol http(s)://"
    fi
  done
  while true; do
    owner=""
    if [ ! -d "$workspace" ] && [ "$turn" = "ADVANCED" ];then
      echo "4) Site Owner. If you want to link this site to an existing account then enter"
      echo "   12 space separated BIP-39 mnemonic words and site owner will be that account."
      echo "   But if you want independent site AccountID, just enter the owner accountID."
      read -p "" words
      
      IFS=" "
      set -- $words
      numWords=$#
      if [ $numWords -eq 1 ]; then
        owner=$1
        if [ ${#owner} -ne 48 ]; then
          echo "Invalid Mintter Account ID"
          continue
        else
          break
        fi
      fi
      if [ $numWords -ne 12 ] && [ $numWords -ne 15 ] && [ $numWords -ne 18 ] && [ $numWords -ne 21 ] && [ $numWords -ne 24 ]; then
        echo "Only 12|15|18|21|24 mnemonic words allowed"
      else
        bip39=1
        break
      fi
    else
      echo "4) Site Owner account ID?."
      read -p "" owner
      if [ ${#owner} -ne 48 ]; then
        echo "Please provide a 48 hex valid mintter account ID"
      else
        break
      fi
    fi
    
  done
  if [ "$turn" = "ADVANCED" ];then
    read -p "5) Do you want the site to share content with non members? n if not sure (y/n)" listing
  else
    listing="n"
  fi
  echo "Nice, we will create a site with the following characteristics:"
  echo "  - Hostname: ${hostname}"
  if [ ! -z "$owner" ]; then
    echo "  - Owner ID: ${owner}"
  else
    echo "  - Owner ID: [not known yet]"
  fi
  if [ "$listing" != "y" ] && [ "$turn" = "ADVANCED" ]; then
    echo "  - Additional flags: -p2p.disable-listing"
  fi
  echo "  - Workspace: ${workspace}"
  read -p "Confirm (y/n)?" confirmation
  if [ "$confirmation" = "y" ]; then
    mkdir -p ${workspace}
    dns=$(echo "MTT_SITE_HOSTNAME=${hostname}" | sed -n 's/.*MTT_SITE_HOSTNAME=http[s]*:\/\/\([^/]*\).*/\1/p')
    echo "MTT_SITE_HOSTNAME=${hostname}" > ${workspace}/.env
    echo "MTT_SITE_WORKSPACE=${workspace}" >> ${workspace}/.env
    mkdir -p ${workspace}/proxy
    docker compose -f mttsite.yml down || true
    cat << BLOCK > ${workspace}/proxy/CaddyFile
{\$MTT_SITE_HOSTNAME}

@ipfsget {
	method GET HEAD OPTIONS
	path /ipfs/*
}
reverse_proxy @ipfsget minttersite:{\$MTT_SITE_BACKEND_GRPCWEB_PORT:56001}

reverse_proxy * nextjs:{\$MTT_SITE_LOCAL_PORT:3000}
BLOCK

    if [ ! -z "$owner" ]; then
      echo "MTT_SITE_OWNER_ACCOUNT_ID=${owner}" >> ${workspace}/.env
    else
      echo -n "MTT_SITE_OWNER_ACCOUNT_ID=" >> ${workspace}/.env
    fi
    if [ "$listing" != "y" ]; then
      echo "MTT_SITE_ADDITIONAL_FLAGS=-p2p.disable-listing" >> ${workspace}/.env
    fi
    curl -s -o mttsite.yml https://raw.githubusercontent.com/mintterteam/mintter/master/docker-compose.yml
	docker compose -f mttsite.yml down || true
    if [ -z "$owner" ]; then
      if [ "$listing" != "y" ]; then
        MTT_SITE_NOWAIT_FLAG=-p2p.disable-listing MTT_SITE_DNS="$dns" docker compose -f mttsite.yml --env-file ${workspace}/.env up -d --pull always --quiet-pull || true
      else
        MTT_SITE_DNS="$dns" docker compose -f mttsite.yml --env-file ${workspace}/.env up -d --pull always --quiet-pull || true
      fi
	  
      rm mttsite.yml
      payload="["
      index=0
      lastIndex=`expr "$numWords" - 1`
      for word in "$@"
      do
        toInsert="\"${word}\","
        if [ $index -eq $lastIndex ]; then
          toInsert="\"${word}\"]"
        fi
        index=`expr "$index" + 1`
        payload="${payload}${toInsert}"
      done
      echo -n "Waiting to register new account on the site..."
      sleep 1
      echo -n "."
      sleep 2
      echo -n "."
      sleep 1
      echo -n "."
      res=$(curl -s -o .output -w %{http_code} -X POST -d ${payload} http://localhost:3000/api/owner-registration)
      if [ $res -ge 200 ] && [ $res -le 299 ]; then
        cat .output >> ${workspace}/.env
        rm .output
        echo "Site registered successfully!"
      else
        echo "[ERROR]: Couldn't register account, please check site docker logs."
        rm .output
        rm ${workspace}/.env
        exit 1
      fi
    else
      MTT_SITE_NOWAIT_FLAG=-identity.no-account-wait MTT_SITE_DNS="$dns" docker compose -f mttsite.yml --env-file ${workspace}/.env up -d --pull always --quiet-pull || true
      rm mttsite.yml
    fi
    exit 0
  fi
done
