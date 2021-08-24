terraform {
  backend "remote" {
    organization = "mintter"

    workspaces {
      name = "digitalocean"
    }
  }

  required_version = ">= 1.0.0"
}
