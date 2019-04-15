# Mockable Express

Open Source Express Server for mocked services. Mock your services and test as you wish

## installation

1. download or clone from the https://github.com/kwar0715/mockableExpress

2. open the project
3. run ``` yarn install ``` or ``` npm install ```
4. run the project by using below commands
  - npm ``` npm run-script start ``` or on custom port  ``` npm run-script start --port 80 ```
  - yarn ``` yarn start ``` or on custom port ``` yarn start 80 ```

## Usage 

1. goto the administration server using ``` <YOUR_IP>:9000 ```
2. generated mockable endpoints must be run on ``` <YOUR_IP>:<PORT> ```

*Default Port is 3000*

3. when you run the server first, You should change the default password. type username as ```user``` and password as ```12345678```
4. reset password
5. enjoy the mockable express. :)

## Customizable Responses

1. You can pass your true data as url parameters and make the custom responses

As an example your url can be like below one

* by URL parameters
``` <host>/users/:userID ```

* by QUERY parameters
``` <host>/users/?userID=123456```

* by Body parameters
``` 
  {
    "userID":"123456"
  }
```


then your response can be customized by the url paramter
```
{
  Id : {{userID}},
  Name: "Name"
}
```
then Id can be changed according to the *userID* parameter

## Technologies

1. Node JS : https://nodejs.org/en/
2. Express Server : https://expressjs.com/ 
3. EJS : https://ejs.co/
4. JSON-DB : https://github.com/Belphemur/node-json-db
5. Winston Logger : https://github.com/winstonjs/winston

## Contribution 

1. Kolitha Warnakulasooriya
2. Prainda Perera
3. Sameera Jayawardana
4. Kasun Kodithuwakku