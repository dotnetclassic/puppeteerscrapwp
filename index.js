const express = require('express');
const app = express();
const df = require('dateformat');
const request = require('request')
const https = require('https');

const otcsv = require('objects-to-csv');
const fs = require('fs');
const puppeteer = require('puppeteer');
const jsdom = require("jsdom");
const timeout = 60 * 1000; // 60 seconds


app.get('/favicon.ico', (req, res) => res.status(204));

app.get('/api/getList', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    var list = ["item1", "item2", "item3"];
    res.json(list);

    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Node.js_logo.svg/1200px-Node.js_logo.svg.png';
    const imageName = './images/1200px-Node.js_logo.png';
    const file = fs.createWriteStream(imageName);

    https.get(imageUrl, response => {
        response.pipe(file);

        file.on('finish', () => {
            file.close();
            console.log(`Image downloaded as ${imageName}`);
        });
    }).on('error', err => {
        fs.unlink(imageName);
        console.error(`Error downloading image: ${err.message}`);
    });

    console.log('Sent list of items');


});

app.get('/api/getWP', async (req, res) => {
    console.log('getWP');

    function delay(time) {
        return new Promise(function (resolve) {
            setTimeout(resolve, time)
        });
    }

    const getObjectValues = async (item) => {
        return new Promise(async (resolve, reject) => {
            let browserTemp = await puppeteer.launch();
            const pageTemp = await browserTemp.newPage();
            await pageTemp.setContent(item);

            const name = await pageTemp.evaluate(() => {
                return document.querySelector('span._2ne0X')?.textContent;
            });
            const contact = await pageTemp.evaluate(() => {
                return document.querySelector('span.WJuYU')?.textContent;
            });
            const time = await pageTemp.evaluate(() => {
                return document.querySelector('span.l7jjieqr.fewfhwl7')?.textContent;
            });
            let dateString = await pageTemp.evaluate(() => {
                const attValue = document.querySelector("div.copyable-text")?.getAttribute("data-pre-plain-text");
                return attValue;
            });
            const data = await pageTemp.evaluate(() => {
                return document.querySelector("div._21Ahp")?.textContent;
            });

            let dateToAdd = null;
            if (dateString) {
                var reg = /\[(.*?)\]/g;
                dateString = dateString.match(reg)[0];
                dateString = dateString.replace("[", "").replace("]", "");
                dateToAdd = new Date(dateString).toLocaleString()
            }


            const getImages = await getImagesAll(pageTemp);
            const blobs = await getImagesBlobs(getImages);

            var img = null;
            if (blobs.length > 0) {
                img = blobs[blobs.length - 1];
            }
            item = {
                name: name,
                contact: contact,
                time: time,
                date: dateToAdd,
                message: data,
                images: img
            };
            pageTemp.close();
            resolve(item);
        });
    }

    const getImagesAll = async (pageTemp) => {
        return await pageTemp.evaluate(() => {
            return Array.from(document.querySelectorAll('img'),
                e => e.getAttribute('src'));
        });
    };

    const getImagesBlobs = async (listImages) => {
        let list = [];
        if (listImages && listImages.length > 0) {
            listImages.forEach(img => {
                if (img && img.includes("blob")) {
                    list.push(img);
                }
            });
        }
        return list;
    };

    const openBlob = async (img, page) => {
        return new Promise((resolve, reject) => {
            console.log("openBlob:.....", img);
            // page.click("img[src='" + img + "']");
            // console.log("taking screenshot...");
            // const pathScreenShot = "./" + Math.random(55, 956) + ".jpg";
            // await page.screenshot({ path: pathScreenShot });
            // await page.keyboard.press('Escape');
            resolve("ok");
        });
    }

    const getMessages = async (page) => {
        var date = new Date();
        // const data = await page.evaluate(() => document.querySelector('*').outerHTML);
        // fs.writeFileSync('./output.htm', data);
        let dataArray = [];
        console.log('In getMessages ' + date.toLocaleString());
        const list = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('div.message-in'),
                e => e.outerHTML)
        });
        console.log('Got total messages: ' + list.length);

        await Promise.all(list.map(async function (item) {
            //console.log("item:", item);
            const htmlItem = await getObjectValues(item);
            dataArray.push(htmlItem);
        }));
        //console.log(dataArray.length);
        if (dataArray.length > 0) {
            dataArray.sort((a, b) => a.time.localeCompare(b.time));
        }
        console.log(dataArray);
        const imgtest = dataArray[0].images;
        
        if (imgtest) {
            await page.click("img[src='" + imgtest + "']");
            console.log("taking screenshot...");
            const pathScreenShot = "./" + Math.random(55, 956) + ".jpg";
            await page.screenshot({ path: pathScreenShot });
            await page.keyboard.press('Escape');
        }
       


        // let fileName = Date.now();
        // fs.writeFileSync('./output/' + fileName + '.txt', JSON.stringify(dataArray));
        //console.log("write to file succefully");
        console.log('End ' + date.toLocaleString());

    };

    (async () => {
        var date = new Date();
        //console.log('before waiting ' + date.toLocaleString());

        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto('https://web.whatsapp.com/', { waitUntil: 'load' });


        await page.waitForSelector("div[title='Search input textbox']", { timeout: 60000 });

        await page.focus("div[title='Search input textbox']")
        //await page.keyboard.type('CDMX Short Term Rentals')
        await page.keyboard.type('test group')

        await page.focus("div[role='listitem']")
        await page.keyboard.press('Enter');

        console.log('Start Wait to load message window with scroll ' + date.toLocaleString());
        await new Promise(function (resolve) { setTimeout(resolve, 40000) });
        getMessages(page);
        // const data = await page.evaluate(() => document.querySelector('*').outerHTML);
        // fs.writeFileSync('./output.htm', data);

        // var timer = setInterval(async () => {
        //     getMessages(browser, page);
        // }, timeout);


    })();

    res.json("getWP");
})


app.get('/api/getWPLocal', async (req, res) => {

    (async () => {
        var date = new Date();
        console.log('before waiting ' + date.toLocaleString());

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('file://D:/workspace/WebSrap-WhatsApp/output.htm');
        let dataArray = [];



        const list = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('div.message-in'),
                e => e.outerHTML)
        });

        //console.log(list);
        let browserTemp = await puppeteer.launch();
        let counter = 0;
        await Promise.all(list.map(async function (item) {
            counter++;
            console.log("counter:", counter);
            //console.log("item:", item);
            const pageTemp = await browserTemp.newPage();
            await pageTemp.setContent(item);

            // const listImages = await pageTemp.evaluate(() => {
            //     return Array.from(document.querySelectorAll('img'),
            //         e => e.getAttribute('src'))
            // });
            // listImages.forEach(img => {
            //     if(img && img.includes("blob")){
            //         console.log(img);
            //     }
            // });
            ///get images
            const _listImages = await pageTemp.evaluate(() => {
                return Array.from(document.querySelectorAll('img'),
                    e => e.getAttribute('src'));
            });
            if (_listImages && _listImages.length > 0) {
                let listImages = [];
                _listImages.forEach(img => {
                    if (img && img.includes("blob")) {
                        listImages.push(img);
                    }
                });
                console.log("listImages:", listImages);
            }

            // const name = await pageTemp.evaluate(() => {
            //     return document.querySelector('span._2ne0X')?.textContent;
            // });
            // const contact = await pageTemp.evaluate(() => {
            //     return document.querySelector('span.WJuYU')?.textContent;
            // });
            // const time = await pageTemp.evaluate(() => {
            //     return document.querySelector('span.l7jjieqr.fewfhwl7')?.textContent;
            // });
            // let dateString = await pageTemp.evaluate(() => {
            //     const attValue = document.querySelector("div.copyable-text")?.getAttribute("data-pre-plain-text");
            //     return attValue;
            // });
            // const data = await pageTemp.evaluate(() => {
            //     return document.querySelector("div._21Ahp")?.textContent;
            // });


            // if (dateString) {
            //     var reg = /\[(.*?)\]/g;
            //     dateString = dateString.match(reg)[0];
            //     dateString = dateString.replace("[", "").replace("]", "");
            //     const dateToAdd = new Date(dateString).toLocaleString()

            //     const isHasDate = dataArray.filter(x => x.date === dateToAdd && x.contact === contact).length > 0;

            //     if (isHasDate) {
            //         //console.log("message already exists");
            //     }
            //     else {
            //         var jsonObject = {
            //             name: name,
            //             contact: contact,
            //             time: time,
            //             date: dateToAdd,
            //             message: data
            //         }
            //         dataArray.push(jsonObject)
            //     }
            // }



            try {
                pageTemp.close();
            }
            catch {

            }
        }));
        //console.log(dataArray);







    })();

    res.json("getWPLocal");
})



app.get('*', (req, res) => {
    console.log('not found:' + req.url);
});





const port = process.env.PORT || 5003;
app.listen(port);

console.log('App is listening on port ' + port + ' on ' + df(new Date(), 'mm/dd/yyyy HH:MM:ss'));