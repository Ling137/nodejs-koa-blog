const Koa = require('koa') // 引入 Koa 框架
const InitManager = require('./core/init') // 引入初始化管理器
const parser = require('koa-bodyparser') // 引入 koa-bodyparser 中间件，用于解析请求体
const cors = require('@koa/cors') // 引入 @koa/cors 中间件，用于处理跨域请求
const ratelimit = require('koa-ratelimit') // 引入 koa-ratelimit 中间件，用于限制接口调用频率

const dotenv = require('dotenv') // 引入 dotenv 库，用于加载环境变量
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development' // 根据环境变量选择不同的 .env 文件
dotenv.config({ path: envFile }) // 加载选定的 .env 文件

require('module-alias/register') // 引入 module-alias，用于模块路径别名

const catchError = require('./middlewares/exception') // 引入异常捕获中间件

const app = new Koa() // 创建 Koa 应用实例

const path = require('path') // 引入 path 模块，用于处理和转换文件路径
const koaStatic = require('koa-static') // 引入 koa-static 中间件，用于提供静态资源服务
app.use(
    koaStatic(path.join(__dirname, './images'), {
        maxage: 30 * 24 * 60 * 60 * 1000, // 设置静态资源的缓存时间，30天
        gzip: true // 启用 gzip 压缩
    })
)

app.use(cors()) // 使用跨域请求处理中间件
app.use(catchError) // 使用异常捕获中间件
app.use(parser()) // 使用请求体解析中间件

// 使用接口调用频率限制中间件
// https://github.com/koajs/ratelimit
const db = new Map() // 创建一个内存数据库实例
app.use(
    ratelimit({
        driver: 'memory', // 使用内存作为存储
        db: db, // 设置数据库实例
        duration: 60000, // 设置限制周期，60000毫秒即1分钟
        errorMessage: 'Sometimes You Just Have to Slow Down.', // 超出频率限制时的错误信息
        id: ctx => ctx.ip, // 根据请求的 IP 地址作为标识
        headers: {
            remaining: 'Rate-Limit-Remaining', // 设置剩余请求次数的响应头
            reset: 'Rate-Limit-Reset', // 设置限制重置时间的响应头
            total: 'Rate-Limit-Total' // 设置总请求次数的响应头
        },
        max: 99, // 设置每个周期内的最大请求次数
        disableHeader: false, // 是否禁用频率限制相关的响应头
        whitelist: ctx => {
            // 白名单逻辑，返回一个布尔值
        },
        blacklist: ctx => {
            // 黑名单逻辑，返回一个布尔值
        }
    })
)

InitManager.initCore(app) // 初始化应用核心功能

let serverLogs = `
    当前环境: ${process.env.NODE_ENV}
    Node.js 已启动服务，地址: http://localhost:${process.env.NODE_PORT}
` // 生成服务启动日志
app.listen(process.env.NODE_PORT, () => console.log(serverLogs)) // 启动服务并打印日志

module.exports = app // 导出应用实例