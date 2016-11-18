# Fabric1GettingStartred
This will include deploying the docker images and the swagger front end. 


### Steps for the setup
####Step1: clone repo
`git clone https://github.com/bmos299/Fabric1GettingStartred`

####Step2: install dependenent packages
`npm install`


#### Step3: fabric commit level: (from vagrant)
`git reset --hard 0edd927f49d6856cf5c792d527fce9bcf45ae050`

#### Step4: make images
`make images`

##### Step5 Create your network
create your network using the docker composer file available [here](https://github.com/ratnakar-asara/Fabric1GettingStartred/blob/master/docker-compose.yml)

#### Step6 : run the sample
Go to folder Fabric1GettingStartred/hfc-swagger

`swagger project start`

