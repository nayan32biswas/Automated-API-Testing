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

## Fix the server access issue for the backend server running in Kubernetes

- Assuming the backend app is running in Kubernetes with the help of minikube.
- Using ingress to expose the backend server and update the host device `/etc/hosts` with value `<minikube-ip> local.blog-app.com`.
- Now the test server cannot access the domain `local.blog-app.com`.

**Solution**:

- Comment out the network for the k6 server in the `docker-compose.yml` file.

```yml
networks:
  - k6
```

- Add the `network_mode: "host"` to the k6 service in the `docker-compose.yml` file. This will give the K6 service access to the host machine `/etc/hosts`.
