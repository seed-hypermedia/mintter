resource "digitalocean_project" "main" {
  name        = "Mintter"
  environment = "Production"
  purpose     = "Other"
}

resource "digitalocean_droplet" "ethosfera" {
  name               = "ethosfera"
  size               = "s-1vcpu-2gb"
  image              = "72067660"
  region             = "fra1"
  backups            = false
  monitoring         = true
  private_networking = true
  ipv6               = true
  resize_disk        = true
  tags               = ["mtt-public"]
  vpc_uuid           = "9f5682e5-cf83-491c-acdb-0e3eded52fbb"
}
