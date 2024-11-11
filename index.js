import express from "express"
const app = express()

import compression from 'express-compression'
app.use(compression())

import apicache from 'apicache'
const cache = apicache.middleware
app.use(cache('12 hours'))

import config from "./config.js"

app.use(config.subpath, express.static('public'))
app.use('/', (req, res) => res.redirect(config.subpath + req.url))


app.listen(config.port, () => {
	console.log("Сервер запущен на", config.port)
})