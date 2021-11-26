# domodel-chat-server

Back-end for [domodel-chat](https://github.com/thoughtsunificator/domodel-chat).

## Getting started

### Installing

- ```npm install```
- ```npm start```

## Events

### Event.GLOBAL_MESSAGE


```json
{
    "message": {
      "source": string,
      "date": Date,
      "content": string,
    }
}
```

### Event.NETWORK_MESSAGE


```json
{
    "message": {
      "source": string,
      "date": Date,
      "content": string,
    }
}
```

### Event.CHANNEL_LIST


```json
{
  "query": string
}
```

### Event.CHANNEL_JOIN


```json
{
  "name": string
}
```

### Event.CHANNEL_TOPIC


```json
{
  "data": {
    "topic": string,
    "name": string
  }
}
```

### Event.CHANNEL_DISCONNECT


```json
{
  "name": string
}
```

### Event.CHANNEL_RECONNECT


```json
{
  "name": string
}
```

### Event.CHANNEL_LEAVE


```json
{
  "name": string
}
```

### Event.CHANNEL_MESSAGE


```json
{
  "channelName": string,
  "message": {
    "source": string,
    "date": Date,
    "content": string,
  }
}
```

### Event.CHANNEL_PRIVATE_MESSAGE


```json
{
  "channelName": string,
  "message": {
    "source": string,
    "date": Date,
    "content": string,
  }
}
```

### Event.CHANNEL_DELETE


```json
{
  "name": string  
}
```

### Event.CHANNEL_MESSAGE_USER


```json
{
  "nickname": string, 
  "content": string, 
  "channelName": string
}
```

### Event.CHANNEL_USER_JOINED


```json
{
  "channelName": string, 
  "user": { 
    "socketId": string, 
    "nickname": string
  }
}
```

### Event.CHANNEL_USER_LEFT


```json
{
  "channelName": "string", 
  "socketId": "string"
}
```

### Event.USER_RENAME


string

### Event.USER_RENAMED


```json
{
  "channelName": string, 
  "nickname": string, 
  "socketId": string
}
```
