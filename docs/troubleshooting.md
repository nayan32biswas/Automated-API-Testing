# Troubleshooting

## Fetching issue to connection with app server running in docker in linux

- Update the docker-compose.yml file with extra hosts.

```yml
services:
  k6:
    ...
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

- `sudo ufw allow 8000` Allow 8000 port.
