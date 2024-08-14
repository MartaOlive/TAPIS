# Docker FROST Server

## Installation
This project is installing the regular FROST server through a Docker container. This installation includes the FROST server with HTTP and MQTT communication protocols. It also mentions the commands to add the requested plugins to the FROST server.  

The commands to be executed are in the right order:
1. Start a fresh installation of the FROST server: `sudo docker-compose up -d`
1. Go to the command line of the Docker container used for the database: `sudo docker exec -it ad4gd_database_1 bash`
1. Connect to the database command line: `psql -p 5432 -U sensorthings`
1. Add the required extension for the database: `CREATE EXTENSION "uuid-ossp";`
1. Go back to the initial command line by writing two times `exit`
1. Add the STA PLUS plugin: `sudo docker cp FROST-Server.Plugin.STAplus-2.2.0-SNAPSHOT.jar ad4gd_web_1:/usr/local/tomcat/webapps/FROST-Server/WEB-INF/lib`
1. Add the the plugin for the authentication: `sudo docker cp FROST-Server.Auth.OAuth2-2.2.0-SNAPSHOT.jar ad4gd_web_1:/usr/local/tomcat/webapps/FROST-Server/WEB-INF/lib`
1. Stop the FROST server: `sudo docker stop ad4gd_web_1`
1. Stop the database of the FROST server: `sudo docker stop ad4gd_database_1`
1. Restart the FROST server: `sudo docker-compose up -d`
1. Verify the launch of the Docker containers: `sudo docker ps`

## Uninstallation

To completely uninstall the FROST server, the following commands should be applied:
1. Stop the Docker container of the FROST server: `sudo docker stop ad4gd_web_1`
1. Stop the Docker container of the database used by the FROST server: `sudo docker stop ad4gd_database_1`
1. Remove the Docker container of the database: `sudo docker remove ad4gd_database_1`
1. Remove the Docker container of the FROST server: `sudo docker remove ad4gd_web_1`
1. Erase all in relation to Docker containers, like the images and the networks: `sudo docker system prune -a`
1. To be sure, erase the volume associated to the database: `sudo docker volume rm ad4gd_postgis_volume`

## Authentication  

This instance of the FROST/STA+ server is supporting the user's authentication. This section explains the requests used in the authentication process.  
First of all, an access token is requested to the Authenix server as follows:
- HTTP POST method
- URL: `https://www.authenix.eu/oauth/token`
- Header: `Accept: application/json`
- Header: `Content-Type: application/x-www-form-urlencoded`
- Header: `Authorization: Basic YWNmMzI2NWYtYWQ3NS00NGRmLWE1OTktY2U3ZmY1NGM5ZDk3OmYyZjkxZTYyYTgxM2JkZjc2YjExNjEyZTJjZWQwNzcyYjZhNmNiMWNhZjQ0MzMwMTU1MTQ1NDNmNjQwYWVkNjQ=`
- Body: `grant_type=client_credentials&scope=idp`  

The Authenix server returns in the response a token. This access token should be used for all the transactions to the FROST/STA+ server. Here a typical request to get data from the FROST/STA+ server:
- HTTP GET method
- URL: `https://frost.iotlab.com/sensorthings2/v1.1/`
- Header: `Accept: */*`
- Header: `Content-Type: application/json`
- Header: `Authorization: Bearer XXX` => Replace `XXX` by the access token provided by Authenix.

A concrete example using Postman is shown below:  
1. Get the access token from Authenix:  
First of all, select POST and complete the URL and the headers:  

![](auth_example/1.jpg) 

Then, complete the body of the request and finally, click on the SEND button:  

![](auth_example/2.jpg)  

The response contains the access token:  

![](auth_example/3.jpg)

2. Get the data from the FROST/STA+ server:  
First of all, select GET and complete the URL and the headers. The string after the word "Bearer" corresponds to the access token received from Authenix above. Then, click on the SEND button.

![](auth_example/6.jpg)
![](auth_example/4.jpg)

The FROST/STA+ server delivers to you the requested data:

![](auth_example/5.jpg)

## Support and author
Cédric Crettaz, IoT Lab, ccrettaz@iotlab.com

## License
Not yet defined.

## Project status
The installation is running in a development environment in the IoT Lab research infrastructure. This project is addressing the following bug related to the FROST server launched through Docker containers: [https://github.com/FraunhoferIOSB/FROST-Server/issues/308](https://github.com/FraunhoferIOSB/FROST-Server/issues/308)
