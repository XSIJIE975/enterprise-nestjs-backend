-- Mock 端点测试数据
-- 用于测试 MockJS 语法和动态 Mock 服务功能


-- 1. 用户列表 Mock (测试 MockJS 数组生成)
INSERT INTO `mock_endpoints` (
    `id`, `name`, `description`, `path`, `method`,
    `enabled`, `statusCode`, `delay`, `responseTemplate`, `templateEngine`,
    `headers`, `validation`, `createdBy`, `createdAt`, `updatedAt`, `version`
) VALUES (
             UUID(),
             '用户列表',
             '返回随机生成的用户列表，测试 MockJS 数组和对象生成',
             '/users',
             'GET',
             true,
             200,
             0,
             '{
               "code": 200,
               "message": "success",
               "data": {
                 "total": 100,
                 "list|10": [{
                   "id|+1": 1,
                   "name": "@cname",
                   "email": "@email",
                   "avatar": "@image(200x200)",
                   "age|18-60": 1,
                   "gender|1": ["male", "female"],
                   "phone": "13800138000",
                   "address": "@county(true)",
                   "createdAt": "@datetime"
                 }]
               }
             }',
             'MOCKJS',
             '{"Content-Type": "application/json"}',
             NULL,
             'system',
             NOW(3),
             NOW(3),
             1
         );


-- 2. 用户详情 Mock (测试路径参数)
INSERT INTO `mock_endpoints` (
    `id`, `name`, `description`, `path`, `method`,
    `enabled`, `statusCode`, `delay`, `responseTemplate`, `templateEngine`,
    `headers`, `validation`, `createdBy`, `createdAt`, `updatedAt`, `version`
) VALUES (
             UUID(),
             '用户详情',
             '返回单个用户详情，使用路径参数 id',
             '/users/:id',
             'GET',
             true,
             200,
             100,
             '{
               "code": 200,
               "message": "success",
               "data": {
                 "id": "@guid",
                 "name": "@cname",
                 "email": "@email",
                 "avatar": "@image(200x200)",
                 "age|18-60": 1,
                 "gender|1": ["male", "female"],
                 "phone": "13800138000",
                 "city": "@city",
                 "province": "@province",
                 "address": "@county(true)",
                 "bio": "@cparagraph(1, 3)",
                 "createdAt": "@datetime",
                 "updatedAt": "@datetime"
               }
             }',
             'MOCKJS',
             '{"Content-Type": "application/json"}',
             NULL,
             'system',
             NOW(3),
             NOW(3),
             1
         );


-- 3. 文章列表 Mock (测试分页和复杂数据)
INSERT INTO `mock_endpoints` (
    `id`, `name`, `description`, `path`, `method`,
    `enabled`, `statusCode`, `delay`, `responseTemplate`, `templateEngine`,
    `headers`, `validation`, `createdBy`, `createdAt`, `updatedAt`, `version`
) VALUES (
             UUID(),
             '文章列表',
             '返回分页文章列表，测试复杂嵌套结构',
             '/articles',
             'GET',
             true,
             200,
             0,
             '{
               "code": 200,
               "message": "success",
               "data": {
                 "total": 256,
                 "page": 1,
                 "pageSize": 20,
                 "list|20": [{
                   "id|+1": 1,
                   "title": "@ctitle(10, 30)",
                   "summary": "@cparagraph(1, 2)",
                   "content": "@cparagraph(5, 10)",
                   "cover": "@image(800x600)",
                   "author": {
                     "id": "@guid",
                     "name": "@cname",
                     "avatar": "@image(100x100)"
                   },
                   "category|1": ["技术", "生活", "随笔", "教程"],
                   "tags|1-3": ["@word", "@word", "@word"],
                   "views|100-10000": 1,
                   "likes|10-1000": 1,
                   "comments|0-100": 1,
                   "status|1": ["draft", "published", "archived"],
                   "publishedAt": "@datetime",
                   "createdAt": "@datetime",
                   "updatedAt": "@datetime"
                 }]
               }
             }',
             'MOCKJS',
             '{"Content-Type": "application/json"}',
             NULL,
             'system',
             NOW(3),
             NOW(3),
             1
         );


-- 4. 创建用户 Mock (测试 POST 请求)
INSERT INTO `mock_endpoints` (
    `id`, `name`, `description`, `path`, `method`,
    `enabled`, `statusCode`, `delay`, `responseTemplate`, `templateEngine`,
    `headers`, `validation`, `createdBy`, `createdAt`, `updatedAt`, `version`
) VALUES (
             UUID(),
             '创建用户',
             '模拟创建用户的响应',
             '/users',
             'POST',
             true,
             201,
             200,
             '{
               "code": 201,
               "message": "用户创建成功",
               "data": {
                 "id": "@guid",
                 "name": "@cname",
                 "email": "@email",
                 "createdAt": "@now"
               }
             }',
             'MOCKJS',
             '{"Content-Type": "application/json"}',
             NULL,
             'system',
             NOW(3),
             NOW(3),
             1
         );


-- 5. 统计数据 Mock (测试数值生成)
INSERT INTO `mock_endpoints` (
    `id`, `name`, `description`, `path`, `method`,
    `enabled`, `statusCode`, `delay`, `responseTemplate`, `templateEngine`,
    `headers`, `validation`, `createdBy`, `createdAt`, `updatedAt`, `version`
) VALUES (
             UUID(),
             '仪表盘统计',
             '返回仪表盘统计数据',
             '/dashboard/stats',
             'GET',
             true,
             200,
             0,
             '{
               "code": 200,
               "message": "success",
               "data": {
                 "users": {
                   "total|1000-10000": 1,
                   "active|100-1000": 1,
                   "new|10-100": 1,
                   "growth": "@float(0, 100, 2, 2)"
                 },
                 "orders": {
                   "total|5000-50000": 1,
                   "pending|10-100": 1,
                   "completed|100-1000": 1,
                   "revenue": "@float(10000, 1000000, 2, 2)"
                 },
                 "products": {
                   "total|100-1000": 1,
                   "inStock|50-500": 1,
                   "lowStock|5-50": 1
                 },
                 "trend|7": [{
                   "date": "@date(yyyy-MM-dd)",
                   "sales|1000-10000": 1,
                   "orders|100-1000": 1,
                   "users|50-500": 1
                 }]
               }
             }',
             'MOCKJS',
             '{"Content-Type": "application/json"}',
             NULL,
             'system',
             NOW(3),
             NOW(3),
             1
         );


-- 6. 错误响应 Mock (测试错误状态码)
INSERT INTO `mock_endpoints` (
    `id`, `name`, `description`, `path`, `method`,
    `enabled`, `statusCode`, `delay`, `responseTemplate`, `templateEngine`,
    `headers`, `validation`, `createdBy`, `createdAt`, `updatedAt`, `version`
) VALUES (
             UUID(),
             '404 错误',
             '模拟资源不存在的错误响应',
             '/error/404',
             'GET',
             true,
             404,
             0,
             '{
               "code": 404,
               "message": "资源不存在",
               "error": "NOT_FOUND",
               "timestamp": "@now"
             }',
             'MOCKJS',
             '{"Content-Type": "application/json"}',
             NULL,
             'system',
             NOW(3),
             NOW(3),
             1
         );


-- 7. 延迟响应 Mock (测试延迟功能)
INSERT INTO `mock_endpoints` (
    `id`, `name`, `description`, `path`, `method`,
    `enabled`, `statusCode`, `delay`, `responseTemplate`, `templateEngine`,
    `headers`, `validation`, `createdBy`, `createdAt`, `updatedAt`, `version`
) VALUES (
             UUID(),
             '延迟响应测试',
             '模拟网络延迟，3秒后返回',
             '/delay',
             'GET',
             true,
             200,
             3000,
             '{
               "code": 200,
               "message": "延迟 3 秒后响应",
               "data": {
                 "timestamp": "@now",
                 "random": "@guid"
               }
             }',
             'MOCKJS',
             '{"Content-Type": "application/json"}',
             NULL,
             'system',
             NOW(3),
             NOW(3),
             1
         );


-- 8. 图片资源 Mock (测试不同 Content-Type)
INSERT INTO `mock_endpoints` (
    `id`, `name`, `description`, `path`, `method`,
    `enabled`, `statusCode`, `delay`, `responseTemplate`, `templateEngine`,
    `headers`, `validation`, `createdBy`, `createdAt`, `updatedAt`, `version`
) VALUES (
             UUID(),
             '图片列表',
             '返回图片资源列表',
             '/images',
             'GET',
             true,
             200,
             0,
             '{
               "code": 200,
               "message": "success",
               "data|10": [{
                 "id": "@guid",
                 "url": "@image(800x600, @color, @word)",
                 "title": "@ctitle(5, 10)",
                 "width|400-1920": 1,
                 "height|300-1080": 1,
                 "size|100-5000": 1,
                 "format|1": ["jpg", "png", "gif", "webp"]
               }]
             }',
             'MOCKJS',
             '{"Content-Type": "application/json"}',
             NULL,
             'system',
             NOW(3),
             NOW(3),
             1
         );


-- 9. 禁用的端点 (测试 enabled 状态)
INSERT INTO `mock_endpoints` (
    `id`, `name`, `description`, `path`, `method`,
    `enabled`, `statusCode`, `delay`, `responseTemplate`, `templateEngine`,
    `headers`, `validation`, `createdBy`, `createdAt`, `updatedAt`, `version`
) VALUES (
             UUID(),
             '禁用的端点',
             '这个端点被禁用，不会响应请求',
             '/disabled',
             'GET',
             false,
             200,
             0,
             '{"code": 200, "message": "这个端点已被禁用"}',
             'MOCKJS',
             '{"Content-Type": "application/json"}',
             NULL,
             'system',
             NOW(3),
             NOW(3),
             1
         );


-- 10. 纯 JSON 模板 (测试 JSON 引擎)
INSERT INTO `mock_endpoints` (
    `id`, `name`, `description`, `path`, `method`,
    `enabled`, `statusCode`, `delay`, `responseTemplate`, `templateEngine`,
    `headers`, `validation`, `createdBy`, `createdAt`, `updatedAt`, `version`
) VALUES (
             UUID(),
             '静态 JSON 响应',
             '测试纯 JSON 模板引擎，不使用 MockJS 语法',
             '/static',
             'GET',
             true,
             200,
             0,
             '{
               "code": 200,
               "message": "这是一个静态 JSON 响应",
               "data": {
                 "version": "1.0.0",
                 "features": ["动态路由", "缓存", "日志"],
                 "status": "active"
               }
             }',
             'JSON',
             '{"Content-Type": "application/json"}',
             NULL,
             'system',
             NOW(3),
             NOW(3),
             1
         );