## Requirements
- [Docker](https://www.docker.com/)
- [NPM](https://www.npmjs.com/)

## Running
- Clone this repository <br>
  `git  clone https://github.com/aridwan/disposability.git`
- Install dependencies <br>
  `npm install`
- Run this command <br>
  `docker-compose up --build`
- Now check from browser `localhost:3000/health` 


## Running through Minikube

### Additional requirements
- [Minikube](https://minikube.sigs.k8s.io/docs/start/?arch=%2Fmacos%2Fx86-64%2Fstable%2Fbinary+download)
- [kubectl](https://kubernetes.io/docs/reference/kubectl/)

### Running
- Start minikube <br>
  `minikube start`
- Deploy all services <br>
  `./deploy.sh`
- Forward port from minikube to host <br>
  `kubectl port-forward svc/my-app-service 3000:80`

### Stopping all services
- Delete all services <br>
  `kubectl delete all --all`
- Stop minikube container <br>
  `minikube stop`