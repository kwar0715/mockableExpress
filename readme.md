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
5. docker command 
  - build ``` docker build . -t <name>```
  - run ```docker run -p 9000:9000 -p 80:80 <name>``` (if run in detached mode use ```-d```)

## Usage 

1. goto the administration server using ``` <YOUR_IP>:9000 ```
2. generated mockable endpoints must be run on ``` <YOUR_IP>:<PORT> ```
3. edit config.js

```
module.exports.HOST = 'http://localhost'; // Application host
module.exports.ADMIN_PORT = '9000';       // administration port
module.exports.API_PORT = '3000';         // api running port
```

*Default Port is 3000*

4. when you run the server first, You should change the default password. type username as ```user``` and password as ```12345678```
5. reset password
6. enjoy :-)

## Authorization

Mockable express is providing token based authentication for endpoints, 
1. click on the menu icon on right side and create token
2. create new domain and path,
3. in the path creation view, enable the *Authorization* check box
4. Add authentication to your header.
5. Keep token safe.

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

## Conditional Response

You can return difference response according to a condition.

```
#if("value1",<operator>,"value2"){
response
}endif
```

value1 and value2 are compaired by the operator what you are using, if the value1 and value2 are satisfied by the comparison, so only the below response will be returened.

#### operators

| Operator| Discription               |
| --------| ------------------------- |
|    =    |   equal to                |
|   !=	  |   not equal               |
|   >	    | greater than              |
|   <	    |   less than               |
|   >=	  | greater than or equal to  |
|   <=    |	less than or equal to     |

Ex:- suppose you need to send A if userId equals to 10, unless you need to send B as the response

*url : <your host>/users/:id*
```
#if("{{id}}",=,"10"){
  A
}endif
B
```

you can add json object in the response

```
#if("{{id}}",=,"10"){
  {
    value: "A"
  }
}endif
 {
    value: "B"
 }
```

## Iterative Response

You can generate your response from iterative manner. if you want to repeate something you can use this syntax.

```
#for("<Count>"){
<Repeatable part>
}endfor
```

suppose you need to pring "Hello" 10 times, 

```
#for("10"){
Hello
}endfor
```

then your response will be 

```
HELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLO
```

add to json response 

```
{
"value": "#for("10"){
Hello
}endfor"
}
```

## Array Iterative Response

You can make the response according to the array of comma seperated response. your body, query parameter can be a comma seperated array or string,

body param:
```
{
 "arr": [1,2,3,4,5]
}
or 
{
 "arr": "1,2,3,4,5"
}
```
query param:

```
<host>/path?arr=1,2,3,4,5
```

usage can be

```
#foreach("[1,2,3,4,5]","ele"){
{{ele}}
}endforeach
```

element iterative element and you can use any name. 

result will be 

```
[1,2,3,4,5]
```

you can use this in json object.

```
{
"value":#foreach("[1,2,3,4,5]","ele"){
{{ele}}
}endforeach
}
```
so the response can be,

```
{
    "value": [
        1,
        2,
        3,
        4,
        5
    ]
}
```



## Constants allocation

You can define a constants in the response body. you can only pass strings and digits for the constant.

#### allocation

```
!<variable name>=<value>!
```

#### usage

```
!<variable name>
```

suppose you need to make a constant called data and value on data should be printed twise.

```
!data=hello!

!data
!data

```

## Comments

You can comment on your reponse.

```
/*
comment string
*/
```

## Upload API

You can create endpoints from upload endpoint. so first you have to enable the upload functionality.
goto ** Menu Bar -> Enable Upload**

```
url : <host>/upload
method : post
headers : Content-Type : application/json
body :{
  [
    {
      "domainName":"testDomain1",
        "pathName":"testPath1",
        "pathUrl":"/testPath1",
        "pathDescription": "testPath1",
        "pathMethod":"post",
        "pathStatus": 200,
        "body":"testPath1"
    },
    {
      "domainName":"testDomain2",
        "pathName":"testPath2",
        "pathUrl":"/testPath2",
        "pathDescription": "testPath1",
        "pathMethod":"get",
        "pathStatus": 200,
        "body":"#if(\"{{id}}\",=,\"10\"){{\"value\": \"A\"}}endif{\"value\": \"B\"}"
    },
    {
      "domainName":"testDomain3",
        "pathName":"testPath3",
        "pathUrl":"/testPath3",
        "pathDescription": "testPath3",
        "pathMethod":"get",
        "pathStatus": 200,
        "body": "{\"messsage\":\"hello\"}"
    }
  ]
}

```

## Technologies

1. Node JS : https://nodejs.org/en/
2. Express Server : https://expressjs.com/ 
3. EJS : https://ejs.co/
4. JSON-DB : https://github.com/Belphemur/node-json-db
5. Winston Logger : https://github.com/winstonjs/winston
6. Bootstrap : https://getbootstrap.com/
7. Jquery : https://jquery.com/

## Contribution 

1. Kolitha Warnakulasooriya
2. Pravinda Perera
3. Sameera Jayawardana
4. Kasun Kodithuwakku
