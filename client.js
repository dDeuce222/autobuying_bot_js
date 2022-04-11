const { InverseClient } = require('bybit-api');
const sound = require("sound-play");
var colors = require('colors');
var fs = require('fs');

const utils = require('./utils.js')

//const API_KEY = 'WhqoibB4l38Hn31wDI';
const API_KEY = 'nsBkKTVYXRkOlnN2CT';

//const PRIVATE_KEY = 'v46IR7nOfAX6RaidzC82Ld0oztqA4pjGpqtZ';
const PRIVATE_KEY = 'dKBpI9hH148HM4r3rk66goKfEsbfRBo5b4GS';
const useLivenet = true;

const client = new InverseClient(
    API_KEY,
    PRIVATE_KEY,
    useLivenet
);

// config.js
let firstRun = true;
let runningCycles = 1;
let minCyclesExperience = 0;
let priceDiffMark_1 = 0;
let priceDiffMark_2 = 0;
let priceDiffMark_3 = 0;
let lowPriceGoodToBuy_1 = 0;
let liqBarsThreshold = 0;
let priceBarsThreshold = 0;
let mainLoopDelay = 0;
let maxOwnContracts = 0;
let minDelayBetweenOrders = 0;
let minRunningCyclesToPlaceOrder = 0;
let offerOffsetDown = 0;
let autoRaiseOffer = false;
let autoRaiseOfferIncrement = 0;
let highChangeThreshold = 0;


// response vars
let lastPrice = 0;
let highPrice24h = 0;
let lowPrice24h = 0;
let lastLastPrice = 0;
let entryPrice = 0;
let liqPrice = 0;
let headerCounter = 0;
let headerInterval = 0;
let ownedContracts = 0;
let walletBalance = 0;
let orderMargin = 0;
let positionMargin = 0;
let autoRaiseAmount = 0;

// aux vars
let pdist = 0; // distance between position to marketprice
let ldist = 0; // distance between marketprice to liquidation
let pdistMax = 0;
let pdistMin = 0;
let command = 'wait'
let PLNonRealized = 0;
let lastOfferDate = null;
let lastOrderId = '';
let lastOrderPrice = 0;
let foguinho = '';

mainLoop();

async function mainLoop() {

    while (true) {

        await loadConfigs();
        await getTickers();
        await getPosition();
        await calculations();
        printLog();
        await new Promise(resolve => setTimeout(resolve, mainLoopDelay));
        firstRun = false;
        runningCycles++;
        lastLastPrice = lastPrice;
    }

    async function loadConfigs() {
        return new Promise(resolve => {
            fs.readFile('./config.json', 'utf8', function(err, data) {
                if (err) throw err; // we'll not consider error handling for now
                var obj = JSON.parse(data);
                priceDiffMark_1 = obj.priceDiffMark_1;
                priceDiffMark_2 = obj.priceDiffMark_2;
                priceDiffMark_3 = obj.priceDiffMark_3;
                lowPriceGoodToBuy_1 = obj.lowPriceGoodToBuy_1;
                liqBarsThreshold = obj.liqBarsThreshold;
                priceBarsThreshold = obj.priceBarsThreshold
                mainLoopDelay = obj.mainLoopDelay;
                headerInterval = obj.headerInterval;
                maxOwnContracts = obj.maxOwnContracts;
                minDelayBetweenOrders = obj.minDelayBetweenOrders;
                minRunningCyclesToPlaceOrder = obj.minRunningCyclesToPlaceOrder;
                offerOffsetDown = obj.offerOffsetDown;
                autoRaiseOffer = obj.autoRaiseOffer;
                autoRaiseOfferIncrement = obj.autoRaiseOfferIncrement;
                highChangeThreshold = obj.highChangeThreshold;

                resolve('')
            });
        });
    }

    async function getTickers() {
        return new Promise(resolve => {
            client.getTickers({ symbol: 'BTCUSD' })
                .then(response => {
                    lastPrice = response.result[0].last_price;
                    highPrice24h = response.result[0].high_price_24h;
                    lowPrice24h = response.result[0].low_price_24h;
                    //console.log("RESPONSE : ", response);
                    resolve('')
                })
                .catch(err => {
                    console.error("getTickers inverse error: ", err);
                    resolve('')
                });
        });
    }

    async function getPosition() {
        return new Promise(resolve => {
            client.getPosition({ symbol: 'BTCUSD' })
                .then(response => {
                    entryPrice = response.result.entry_price;
                    liqPrice = response.result.liq_price;
                    ownedContracts = response.result.size;
                    unrealizedPNL = response.result.unrealised_pnl;
                    walletBalance = response.result.wallet_balance;
                    orderMargin = response.result.order_margin;
                    positionMargin = response.result.position_margin;
                    //console.log("RESPONSE : ", response);
                    resolve('')
                })
                .catch(err => {
                    console.error("getPosition inverse error: ", err);
                    resolve('')
                });
        });
    }


    async function queryActiveOrder() {

        let ret = false;

        return new Promise(resolve => {

            client.queryActiveOrder({ symbol: 'BTCUSD' })
                .then(response => {
                    //console.log("RESPONSE queryActiveOrder: ", response);
                    for (let i = 0; i < response.result.length; i++) {
                        //console.log('OFFERS LIST')
                        const offer = response.result[i];
                        if (offer.order_id == lastOrderId.toString()) {
                            //console.log("offer found yet : ");
                            ret = true;
                        }
                    }

                }).catch(err => {
                    console.error("queryActiveOrder inverse error: ", err);
                });

            resolve(ret)
        });
    }


    async function placeActiveOrder(price) {

        return new Promise(resolve => {

            let activeOrderExists = false;

            client.queryActiveOrder({ symbol: 'BTCUSD' })
                .then(response => {
                    //console.log("RESPONSE queryActiveOrder: ", response);
                    for (let i = 0; i < response.result.length; i++) {
                        //console.log('OFFERS LIST')
                        const offer = response.result[i];
                        if (offer.order_id == lastOrderId.toString()) {
                            activeOrderExists = true;
                        }
                    }

                    if (activeOrderExists) {
                        process.stdout.write(`:Order is active: `.yellow.bgBlack)
                        process.stdout.write(`${lastOrderId}`.brightBlue.bgBlack)
                        process.stdout.write(`@`.brightCyan.bgBlack)
                        process.stdout.write(`${lastOrderPrice.toFixed(2)}`.brightYellow.bgBlack)
                        console.log()
                    } else {
                        process.stdout.write(`:Placing order @ ${price.toFixed(2).brightYellow.bgBlack} ${new Date().toString().replace('(Brasilia Standard Time)','')}`.brightYellow.bgBlack)
                        process.stdout.write(`offerOffsetDown is ${offerOffsetDown.toFixed(2)}`.brightYellow.bgBlack)

                        client.placeActiveOrder({ order_type: 'Limit', side: 'Buy', symbol: 'BTCUSD', qty: 1, price: price, time_in_force: 'GoodTillCancel' })
                            .then(response => {
                                //console.log("RESPONSE ACTIVER ORDER: ", response);
                                lastOrderId = response.result.order_id
                                lastOrderPrice = response.result.price
                                lastOfferDate = new Date()
                                resolve('')
                            })
                            .catch(err => {
                                console.error("placeActiveOrder error: ", err);
                                resolve('')
                            });
                    }

                }).catch(err => {
                    console.error("queryActiveOrder inverse error: ", err);
                });


        })
    }




    async function calculations() {

        return new Promise(resolve => {

            pdist = Number(lastPrice - entryPrice).toFixed(2);
            if (firstRun) { // init variables for Min and Max
                pdistMax = pdist;
                pdistMin = pdist;
            } else {
                if (Math.abs(pdist) > Math.abs(pdistMax)) pdistMax = pdist
                if (Math.abs(pdist) < Math.abs(pdistMin)) pdistMin = pdist
            }

            ldist = Number(lastPrice - liqPrice);

            if (runningCycles > minCyclesExperience) {
                let lastCommand = command;
                command = 'none';

                if (lastPrice < entryPrice) // quando o valor atual já é menor que o valor da posicao
                    command = 'watch';

                if ((Math.abs((entryPrice - lastPrice))) > priceDiffMark_1) // quando atinge a diferenca desejada para comprar mais Mark_1
                    command = 'Mark #1';

                if ((Math.abs((entryPrice - lastPrice))) > priceDiffMark_2)
                    command = 'Mark #2';

                if ((Math.abs((entryPrice - lastPrice))) > priceDiffMark_3)
                    command = 'Mark #3';

                if (autoRaiseOffer) {
                    autoRaiseAmount = Number(lowPrice24h) + Number((runningCycles * autoRaiseOfferIncrement))
                }

                if (Number(lastPrice) <= Number(lowPriceGoodToBuy_1)) {
                    command = 'GBuy_1 @ ' + lowPriceGoodToBuy_1;
                }

                command != lastCommand ? commandChanged = true : commandChanged = false;

                PLNonRealized = (unrealizedPNL / positionMargin) * 100;

            }
            resolve('');
        });
    }

    async function printLog() {

        if (headerCounter >= headerInterval || headerCounter == 0 || commandChanged) {
            //sound.play("D:\\workspace\\bybit\\bemtevi.mp3", 0.2);

            utils.printCurrPriceBars(highPrice24h, lowPrice24h, lastPrice)

            process.stdout.write(`| `.grey.bgBlack)
            process.stdout.write(`[`.white.bgBlack)
            process.stdout.write(`entry`.yellow.bgBlack)
            process.stdout.write(`@ `.cyan.bgBlack)
            process.stdout.write(Number(entryPrice).toFixed(2).brightYellow.bgBlack)
            process.stdout.write(`]`.white.bgBlack)
            process.stdout.write(`| `.grey.bgBlack)
            process.stdout.write(`[`.white.bgBlack)
            process.stdout.write(`liq`.yellow.bgBlack)
            process.stdout.write(`@ `.cyan.bgBlack)
            process.stdout.write(Number(liqPrice).toFixed(2).brightYellow.bgBlack)
            process.stdout.write(`]`.white.bgBlack)
            process.stdout.write(`-| `.grey.bgBlack)
            process.stdout.write(`[c]`.white.bgBlack)
            process.stdout.write(`--`.grey.bgBlack)
            process.stdout.write(`unrealized`.random.bgBlack)
            process.stdout.write(`-|--`.grey.bgBlack)
            process.stdout.write(`[-]`.white.bgBlack)
            process.stdout.write(`------`.grey.bgBlack)
            process.stdout.write(`[+]`.white.bgBlack)
            process.stdout.write(`----`.grey.bgBlack)
            process.stdout.write(`[+/-]`.white.bgBlack)
            process.stdout.write(`---|`.grey.bgBlack)

            if (command.search("Buy") > 0)
                process.stdout.write(command.brightGreen.bgBlack)
            else if (commandChanged)
                process.stdout.write(command.brightCyan.bgBlack)
            else
                process.stdout.write(command.yellow.bgBlack)

            process.stdout.write(`-------${runningCycles}----${walletBalance} ${orderMargin} ${positionMargin} ${PLNonRealized.toFixed(2)}%`.grey.bgBlack)

            console.log()
            headerCounter = 0;
        }
        headerCounter++;

        // inicio calculo foguinho
        //process.stdout.write('fd % ' + Math.abs(lastLastPrice - lastPrice) + ' ')
        if (Math.abs(lastLastPrice - lastPrice) > highChangeThreshold)
            foguinho = '*';
        else
            foguinho = ' ';

        // fim calculo foguinho


        process.stdout.write(foguinho.brightYellow.bgBlack)
        if (Number(lastPrice) > Number(lastLastPrice))
            process.stdout.write(lastPrice.green.bgBlack)
        else if (Number(lastPrice) < Number(lastLastPrice))
            process.stdout.write(lastPrice.red.bgBlack)
        else
            process.stdout.write(lastPrice.white)

        process.stdout.write(foguinho.brightYellow.bgBlack)
        process.stdout.write("| ".grey.bgBlack)

        process.stdout.write(utils.indent(pdist, 7).grey.bgBlack)
        process.stdout.write(' [')
        utils.printPriceRangeBars(entryPrice, lastPrice, priceBarsThreshold)
        process.stdout.write(']')
        process.stdout.write("| ".grey.bgBlack + utils.indent(ldist.toFixed(2), 7));
        process.stdout.write('[')
        utils.printLiqBars(lastPrice, liqPrice, liqBarsThreshold)
        process.stdout.write(']')
        process.stdout.write('|'.grey.bgBlack)
        process.stdout.write(' ' + ownedContracts.toString().america)
        if (Number(unrealizedPNL) > 0)
            process.stdout.write(" " + utils.indent(unrealizedPNL, 10).brightYellow.bgBlack)
        else
            process.stdout.write(" " + utils.indent(unrealizedPNL, 10).red.bgBlack)

        process.stdout.write(" |".grey.bgBlack)
        process.stdout.write(" " + utils.indent(pdistMin, 7))
        process.stdout.write(" " + utils.indent(pdistMax, 7))
        process.stdout.write(" " + utils.indent(Math.abs(Number(pdistMax - pdistMin).toFixed(2)), 6).blue.bgBlack)

        process.stdout.write("[AR:".grey.bgBlack) //AutoRaise
        if (autoRaiseAmount > lastPrice)
            process.stdout.write(Number(autoRaiseAmount).toFixed(2).brightYellow.bgBlack)
        else
            process.stdout.write(Number(autoRaiseAmount).toFixed(2).grey.bgBlack)

        process.stdout.write("]".grey.bgBlack)

        process.stdout.write(" >".grey.bgBlack)
        if (command.search("GBuy") == 0) {
            process.stdout.write(command.brightGreen.bgBlack)
            process.stdout.write(" ".bgBlack)
            if (ownedContracts >= maxOwnContracts) {
                process.stdout.write(`:Param maxOwnContracts reached. Not buying now.`)
            } else if (lastOfferDate != null && (new Date().getTime() - lastOfferDate.getTime() < minDelayBetweenOrders)) {
                process.stdout.write(`:[minDelayBetweenOrders] It´s too early to place new order ${new Date().getTime() - lastOfferDate.getTime()} out of ${minDelayBetweenOrders}`)
            } else if (runningCycles < minRunningCyclesToPlaceOrder) {
                process.stdout.write(`:[minRunningCyclesToPlaceOrder] runningCycles not reached current is ${runningCycles} out of ${minRunningCyclesToPlaceOrder} `)
            } else {
                await placeActiveOrder(Number(lastPrice) - offerOffsetDown)
            }

        } else {
            process.stdout.write(command.yellow.bgBlack)
            process.stdout.write(':none')
        }

        process.stdout.write(" ".grey.bgBlack)

        console.log();

    }
}