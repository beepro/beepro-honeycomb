# Installation

- Install mongodb
- Install nodejs and execute command below

```
npm i
npm start
```


# Environment variables

|Environment|Description|Required |Default Value|
|-----------|-----------|---------|-------------|
|BEEPRO_HASH_SECRET|Key is used to generate ID| - |AWESOME BEEPRO|
|BEEPRO_MONGO_URL|mongodb URL| - |mongodb://localhost:27017|
|BEEPRO_TOKEN|beepro-nabee github token to update upstream| Requred |-|
|GLOBAL_HOST|Global host name| - |localhost|
|GLOBAL_PORT|Global port name| - |5432|

# Development

```
npm run watch
```

Execute test code, bundle file then start up server.
It is applying hot load when file has been change.
