<p align="center">
  <img src="https://github.com/kwar0715/mockableExpress/blob/master/public/imgs/logo.png" width="350"/>
</p>

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
5. enjoy :-)

## Customizable Responses

1. You can pass your true data as url parameters and make the custom responses

As an example your url can be like below one

#### URL parameters
``` <host>/users/:userID ```

#### QUERY parameters
``` <host>/users/?userID=123456```

#### Body parameters
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

## Custom Database Actions

You can use your own database to save and retrive your mocked data temporarly.

### save your data on database

```
{
  #save("<your key >","<your value>")#
}
```

save with parameters,

you are passing a value as URL, Query, Body parameter. you can add you parameter as below,

*url : <your host>/users/:id/:value*
```
{
  #save("{{id}}","{{value}}")#
}
```

### get your data from database

```
{ 
  value: #get("<your key >")# 
}
```

you are passing a value as URL, Query, Body parameter. you can retrieve your data as below,

*url : <your host>/users/:id*

```
{
  value: #get("{{id}}")#
}
```
### delete your data from database

```
#del("<your key >")#
```

you are passing a value as URL, Query, Body parameter. you can retrieve your data as below,

*url : <your host>/users/:id*

```
#del("{{id}}")#
```


## Technologies

1. Node JS : https://nodejs.org/en/
2. Express Server : https://expressjs.com/ 
3. EJS : https://ejs.co/
4. JSON-DB : https://github.com/Belphemur/node-json-db
5. Winston Logger : https://github.com/winstonjs/winston
6. Bootstrap : https://getbootstrap.com/

## Contribution 

1. Kolitha Warnakulasooriya
2. Prainda Perera
3. Sameera Jayawardana
4. Kasun Kodithuwakku
