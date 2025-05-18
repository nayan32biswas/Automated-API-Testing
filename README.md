# Automated API Testing

## .env File

- Duplicate the `example.env` and rename the new file to `.env`.

## Add default user credentials

- Manually Create User to the main app.
- Add the credentials to the `.env` file.

## Run load test

Run load test with docker

`docker-compose run --rm k6 run /tests/load-testing.js`

Visit [Test Dashboard](http://localhost:3005/dashboards) see results.

## [Troubleshooting](./docs/troubleshooting.md)
