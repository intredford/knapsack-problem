import express from "express"
const app = express()

import compression from 'express-compression'
app.use(compression())

// import apicache from 'apicache'
// const cache = apicache.middleware
// app.use(cache('12 hours'))

app.use(express.static('public'))

import config from "./config.js"

app.listen(config.port, () => {
	console.log("Сервер запущен на", config.port)
})