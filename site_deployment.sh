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
  echo "1) Do you want to start a new site (ON) or turn off an existing one (OFF)?:"
  read turn
  if [ "$turn" = "ON" ]; then
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
    curl -s -o mttsite.yml https://minttersite.s3.amazonaws.com/docker-compose.yml
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
    done < "${workspace}/.env"
    read -p "Do you want to continue(c) with those params or overide(r) them (c/r)?" response
    if [ "$response" = "c" ]; then
        curl -s -o mttsite.yml https://minttersite.s3.amazonaws.com/docker-compose.yml
        MTT_SITE_NOWAIT_FLAG=-identity.no-account-wait docker compose -f mttsite.yml --env-file ${workspace}/.env up -d --pull always --quiet-pull
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
    if [ ! -d "$workspace" ];then
      echo "4) Site Owner seed. Enter 12 space separated BIP-39 mnemonic words"
      read -p "" words
      IFS=" "
      set -- $words
      numWords=$#
      if [ $numWords -ne 12 ] && [ $numWords -ne 15 ] && [ $numWords -ne 18 ] && [ $numWords -ne 21 ] && [ $numWords -ne 24 ]; then
        echo "Please provide a 12|15|18|21|24 BIP-39 compatible workds"
      else
        break
      fi
    else
      echo "4) Site Owner account CID?."
      read -p "" owner
      if [ ${#owner} -ne 72 ]; then
        echo "Please provide a 72 hex valid mintter account CID"
      else
        break
      fi
    fi
    
  done
  echo "Nice, we will create a site with the following characteristics:"
  echo "  - Hostname: ${hostname}"
  if [ ! -z "$owner"]; then
    echo "  - Owner ID: ${owner}"
  else
    echo "  - Owner ID: ***"
  fi

  echo "  - Workspace: ${workspace}"
  read -p "Confirm (y/n)?" confirmation
  if [ "$confirmation" = "y" ]; then
    mkdir -p ${workspace}
    echo "MTT_SITE_HOSTNAME=${hostname}" > ${workspace}/.env
    echo "MTT_SITE_WORKSPACE=${workspace}" >> ${workspace}/.env
    if [ ! -z "$owner"]; then
      echo "MTT_SITE_OWNER_ACCOUNT_ID=${owner}" >> ${workspace}/.env
    else
      echo -n "MTT_SITE_OWNER_ACCOUNT_ID=" >> ${workspace}/.env
    fi
    curl -s -o mttsite.yml https://minttersite.s3.amazonaws.com/docker-compose.yml
    if [ -z "$owner"]; then
      docker compose -f mttsite.yml --env-file ${workspace}/.env up -d --pull always --quiet-pull
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
      echo "Waiting to register new account on the site..."
      sleep 3
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
      MTT_SITE_NOWAIT_FLAG=-identity.no-account-wait docker compose -f mttsite.yml --env-file ${workspace}/.env up -d --pull always --quiet-pull
      rm mttsite.yml
    fi
    exit 0
  fi
done
