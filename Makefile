
.PHONY: ci-install ci-lint ci-test ci-build docker-build

ci-install:
	npm ci

ci-lint:
	npm run lint

ci-test:
	npm test

ci-build:
	npm run build

docker-build:
	docker build -t $(IMAGE_TAG) .
