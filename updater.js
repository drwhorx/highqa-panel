const express = require('express')
const app = express()

console.log((new Date()).toISOString());

app.get('/highqapanel/update', (req, res) => {
    res.send(JSON.stringify({
        "version": "v0.1.1",
        "notes": "Beta Release",
        "pub_date": "2022-07-05T18:22:04Z",
        "platforms": {
            "windows-x86_64": {
                "signature": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDVGQjk5ODc1MjgzNjk5RjcKUldUM21UWW9kWmk1WDN6VHA0b2E1VE04dXhvNzBRdzZVK2N1Y0JUNys0RGhWVjl4dnpMZFZIaFUK",
                "url": "https://github.com/drwhorx/highqa-panel/releases/download/v0.1.1/High.QA.Panel_0.1.1_x64_en-US.msi.zip"
            }
        }
    }));
})

app.listen(3000)