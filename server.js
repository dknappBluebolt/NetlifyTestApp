require('isomorphic-fetch');
const dotenv = require('dotenv');
dotenv.config();
const Koa = require('koa');
const next = require('next');
const { default: createShopifyAuth } = require('@shopify/koa-shopify-auth');
const { verifyRequest } = require('@shopify/koa-shopify-auth');
const session = require('koa-session');
const { default: graphQLProxy } = require('@shopify/koa-shopify-graphql-proxy');
const { ApiVersion } = require('@shopify/koa-shopify-graphql-proxy');
const Router = require('koa-router');
const cheerio = require('cheerio');
const { version } = require('cheerio');

const port = parseInt(process.env.PORT, 10) || 3005;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const {
  SHOPIFY_API_SECRET_KEY,
  SHOPIFY_API_KEY,
  HOST,
} = process.env;

app.prepare().then(() => {
  const server = new Koa();
  const router = new Router();
  server.use(session({ sameSite: 'none', secure: true }, server));
  server.keys = [SHOPIFY_API_SECRET_KEY];

  server.use(
    createShopifyAuth({
      apiKey: SHOPIFY_API_KEY,
      secret: SHOPIFY_API_SECRET_KEY,
      scopes: ['read_products', 'write_products', 'read_themes', 'write_themes'],
      async afterAuth(ctx) {
        const { shop, accessToken } = ctx.session;
        ctx.cookies.set("shopOrigin", shop, {
          httpOnly: false,
          secure: true,
          sameSite: 'none'
        });
      }
    })
  );

  server.use(graphQLProxy({ version: ApiVersion.July20 }));

  router.get('/reindex', verifyRequest(), async (ctx) => {
    try {
      //let job = await workQueue.add({ accessToken: ctx.session.accessToken, shop: ctx.session.shop });
      //console.log('job.id', job.id);
      var accessToken = ctx.session.accessToken;
      var shop = ctx.session.shop;
      var page = 1;
      responseData = [];
      allResponseData = [];
      do {
        var response = await fetch(`https://${shop}/blogs/authors?page=${page}&view=authors-json`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            "X-Shopify-Access-Token": accessToken,
          }
        });
        var responseText = await response.text();
        var $ = cheerio.load(responseText);
        var jsonText = $('body').html();
        jsonText = jsonText.replace(/&quot;/g, '"');
        responseData = JSON.parse(jsonText);
        allResponseData = allResponseData.concat(responseData);
        console.log('Download 1000 authors. Page:', page);
        //job.progress();
        page++;
      } while (responseData.length > 0)
      console.log('Downloaded all authors, total:', allResponseData.length);
        var authorNavItems = 'A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,num'.split(',');
        authorData = {};
        authorNavItems.forEach(item => {
            authorData[item] = [];
        });
        allResponseData.forEach(d => {
            var array = authorData[d.name[0].toUpperCase()];
            if (array == undefined) {
                authorData['num'].push(d);
            } else {
                array.push(d);
            }
        });
        authorNavItems.forEach(item => {
            authorData[item] = authorData[item].sort(function (a, b) {
                a = a.name.toLowerCase();
                b = b.name.toLowerCase();
                if (a > b) return 1;
                if (a < b) return -1;
                return 0;
            });
        });

        authorNavItems.forEach(async item => {
          try {
            let url = `https://${shop}/admin/api/2020-04/themes/${process.env.THEME_ID}/assets.json`;
            var response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    "X-Shopify-Access-Token": accessToken,
                },
                body: `{
                "asset": {
                    "key": "templates/blog.author-json-${item}.liquid",
                    "value": "{% layout none %} ${JSON.stringify(authorData[item]).replace(/"/g, '\\"')}"
                }
            }`
            });
            if(response.ok) {
              console.log('Uploading JSON to Shopify:', item, authorData[item].length);
            } else {
              console.error('Failed Uploading JSON to Shopify:', item, response.status, response.statusText);
            }
          } catch (err) {
            console.error(err.message);
            console.error('Failed Uploading JSON to Shopify:', item, authorData[item].length);
          }

        });
      ctx.respond = true;
      ctx.res.statusCode = 200;
    } catch (err) {
      ctx.respond = true;
      ctx.res.statusMessage = err.message;
      ctx.res.statusCode = 200;
    }
  });

  router.get('(.*)', verifyRequest(), async (ctx) => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  });

  server.use(router.allowedMethods());
  server.use(router.routes());

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
