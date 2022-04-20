const { InverseClient, WebsocketClient, DefaultLogger } = require('bybit-api')
var readline = require('readline');
//const iohook = require('iohook');
const sound = require("sound-play") //https://www.npmjs.com/package/sound-play
var colors = require('colors')
var fs = require('fs')

// Disable all logging on the silly level
DefaultLogger.silly = () => {};

const utils = require('./utils.js')

const API_KEY = 'nsBkKTVYXRkOlnN2CT'
const PRIVATE_KEY = 'dKBpI9hH148HM4r3rk66goKfEsbfRBo5b4GS'
const useLivenet = true

const client = new InverseClient(
    API_KEY,
    PRIVATE_KEY,
    useLivenet
);

// config.js
let firstRun = true
let runningCycles = 1
let minCyclesExperience = 0
let priceDiffMark_1 = 0
let priceDiffMark_2 = 0
let priceDiffMark_3 = 0
let lowPriceGoodToBuy1 = 0
let liqBarsThreshold = 0
let mainLoopDelay = 0
let maxOwnContracts = 0
let minDelayBetweenOrders = 0
let minRunningCyclesToPlaceOrder = 0
let offerOffsetDown = 0
let autoRaiseOffer = false
let autoRaiseOfferIncrement = 0
let highChangeThreshold = 0
let qtdContractsToBuy = 0
let ancientOrderMinutes = 0
let minPriceDistanceOrder = 0
let excludeFromDebugLog = []
let autoManageOrderPrice = false
let autoMinPriceDistance = -1000
let autoOfferOffsetDown = 0
let considerClosingPositionPriceDistance = 0
let priceDistThreshold = 0
let qtdContractsToClosePosition = 0
let liquidationDistAlert = 100
let liquidationQtdOffer = 10
let minOwnedContractsToStartClosingPosition = 0
let ancientClosePositionOrderMinutes = 0

// response vars
let lastPrice = 0
let highPrice24h = 0
let lowPrice24h = 0
let lastLastPrice = 0
let entryPrice = 0
let liqPrice = 0
let headerCounter = 0
let headerInterval = 0
let ownedContracts = 0
let walletBalance = 0
let orderMargin = 0
let positionMargin = 0
let autoRaiseAmount = 0
let lastMarkPrice = 0

// aux vars
let pdist = 0 // distance between position to marketprice
let ldist = 0 // distance between marketprice to liquidation
let pdistMax = 0
let pdistMin = 0
let command = 'wait'
let PLNonRealized = 0
let lastOfferDate = null
let lastOrderId = ''
let lastOrderPrice = 0
let lastClosePositionOrderId = 0
let lastClosePositionOrderPrice = 0
let lastClosePositionOrderCreatedAt = null
let lastOrderCreatedAt = null
let lastOrderQty = 0;
let foguinho = ' '
let bybitApiCalls = 0
let bybitApiCallsPerMinute = 0
let dtCalcApiCals = new Date()
let dtStartApiCals = new Date()
let priceHistory = []
let activeOrderExists = false
let isLongActive = false
let lastEntryPrice = 0;

const wsConfig = {
    key: API_KEY,
    secret: PRIVATE_KEY,
    livenet: useLivenet,

    // how long to wait (in ms) before deciding the connection should be terminated & reconnected
    // pongTimeout: 1000,

    // how often to check (in ms) that WS connection is still alive
    pingInterval: 60000,

    // how long to wait before attempting to reconnect (in ms) after connection is closed
    // reconnectTimeout: 500,

    // config options sent to RestClient (used for time sync). See RestClient docs.
    // restOptions: { },

    // config for axios used for HTTP requests. E.g for proxy support
    // requestOptions: { }

    // override which URL to use for websocket connections
    // wsUrl: 'wss://stream.bytick.com/realtime'
};

const ws = new WebsocketClient(wsConfig, DefaultLogger);

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY)
    process.stdin.setRawMode(true);

process.stdin.on('keypress', (chunk, key) => {
    if (key && key.name == 'q')
        process.exit()

});

mainLoop();

/* iohook.on("keypress", event => {
    console.log(event);
    // {keychar: 'f', keycode: 19, rawcode: 15, type: 'keypress'}
});

iohook.start(false); */

ws.on('update', data => {
    //console.log('data : ' + JSON.stringify(data))
    commandChanged = true
    console.log(' ' + data.data[0].order_status.toString().brightYellow.bgBlack + '@'.brightCyan.bgBlack +
        data.data[0].price.toString().brightYellow.bgBlack + ' ' +
        new Date().toString().substring(16).replace('GMT-0300 (Brasilia Standard Time)', '').yellow.bgBlack +
        `ep=${Number(entryPrice).toFixed(2)}`.yellow.bgBlack +
        ` cp=${(Number(entryPrice) + Number(considerClosingPositionPriceDistance)).toFixed(2)}`.yellow.bgBlack)


    process.stdout.write((Number(entryPrice) + Number(considerClosingPositionPriceDistance)).toFixed(2).yellow.bgBlack)

    if (data.data[0].order_status == 'Filled') {
        let dtnow = new Date()

        let logOutput = dtnow.toString().replace('GMT-0300 (Brasilia Standard Time)', '')
        logOutput = logOutput + "owned:" + ownedContracts + " "
        logOutput = logOutput + "entryPrice:" + Number(entryPrice).toFixed(2) + " "
        logOutput = logOutput + "liqPrice:" + Number(liqPrice).toFixed(2) + " "
        logOutput = logOutput + "price:" + Number(lastPrice).toFixed(2)
        logOutput = logOutput + "PLNonRealized:" + Number(PLNonRealized).toFixed(2) + " \n"

        fs.appendFile('bybit.log', logOutput, (err) => {
            if (err) throw err;
            //console.log('Log file updated!');
        });

    }
});

ws.on('open', ({ wsKey, event }) => {
    //console.log('connection open for websocket with ID: ' + wsKey);
});

ws.subscribe(['order'])

async function mainLoop() {

    console.log()
    console.log()
    console.log('  .______  ._______ ._______  _____.______._'.brightGreen.bgBlack)
    console.log('  :      \\ : __   / : .___  \\ \\__ _:|\\__ _:|'.green.bgBlack)
    console.log('  |   .   ||  |>  \\ | :   |  |  |  :|  |  :|'.brightMagenta.bgBlack)
    console.log('  |   :   ||  |>   \\|     :  |  |   |  |   |'.brightMagenta.bgBlack)
    console.log('  |___|   ||_______/ \\_. ___/   |   |  |   |'.magenta.bgBlack)
    console.log('      |___|            :/       |___|  |___|'.white.bgBlack)
    console.log('                       :                    '.brightWhite.bgBlack)
    console.log()

    sound.play("D:\\workspace\\bybit\\abbot\\buybit-machine\\Connected.mp3", 0.2)

    removeOlderOrders()

    await new Promise(resolve => setTimeout(resolve, 3000))

    while (true) {

        await loadConfigs()
        await getTickers()
        await getPosition()
        await calculations()
        printLog()
        await new Promise(resolve => setTimeout(resolve, mainLoopDelay))
        firstRun = false
        runningCycles++
        lastLastPrice = lastPrice
    }

    async function loadConfigs() {
        return new Promise(resolve => {
            fs.readFile('./config.json', 'utf8', function(err, data) {
                if (err) throw err; // we'll not consider error handling for now
                var obj = JSON.parse(data)
                priceDiffMark_1 = obj.priceDiffMark_1
                priceDiffMark_2 = obj.priceDiffMark_2
                priceDiffMark_3 = obj.priceDiffMark_3
                lowPriceGoodToBuy1 = obj.lowPriceGoodToBuy1
                liqBarsThreshold = obj.liqBarsThreshold
                if (mainLoopDelay != obj.mainLoopDelay) {
                    bybitApiCalls = 0
                    dtCalcApiCals = new Date()
                }
                mainLoopDelay = obj.mainLoopDelay
                headerInterval = obj.headerInterval
                maxOwnContracts = obj.maxOwnContracts
                minDelayBetweenOrders = obj.minDelayBetweenOrders
                minRunningCyclesToPlaceOrder = obj.minRunningCyclesToPlaceOrder
                offerOffsetDown = obj.offerOffsetDown
                autoRaiseOffer = obj.autoRaiseOffer
                autoRaiseOfferIncrement = obj.autoRaiseOfferIncrement
                highChangeThreshold = obj.highChangeThreshold
                qtdContractsToBuy = obj.qtdContractsToBuy
                ancientOrderMinutes = obj.ancientOrderMinutes
                minPriceDistanceOrder = obj.minPriceDistanceOrder
                excludeFromDebugLog = obj.excludeFromDebugLog
                autoManageOrderPrice = obj.autoManageOrderPrice
                autoMinPriceDistance = obj.autoMinPriceDistance
                autoOfferOffsetDown = obj.autoOfferOffsetDown
                considerClosingPositionPriceDistance = obj.considerClosingPositionPriceDistance
                priceDistThreshold = obj.priceDistThreshold
                qtdContractsToClosePosition = obj.qtdContractsToClosePosition
                liquidationDistAlert = obj.liquidationDistAlert
                liquidationQtdOffer = obj.liquidationQtdOffer
                minOwnedContractsToStartClosingPosition = obj.minOwnedContractsToStartClosingPosition
                ancientClosePositionOrderMinutes = obj.ancientClosePositionOrderMinutes

                resolve('')
            });
        });
    }

    async function getTickers() {
        return new Promise(resolve => {
            bybitApiCalls++
            client.getTickers({ symbol: 'BTCUSD' })
                .then(response => {
                    debugFile(response, 'getTickers')
                    lastPrice = response.result[0].last_price
                    highPrice24h = response.result[0].high_price_24h
                    lowPrice24h = response.result[0].low_price_24h
                    lastMarkPrice = response.result[0].mark_price

                    resolve('')
                })
                .catch(err => {
                    debugFile(err, 'getTickers')
                    console.error("getTickers inverse error: ", err)
                    resolve('')
                });
        });
    }

    async function getPosition() {
        return new Promise(resolve => {
            bybitApiCalls++
            client.getPosition({ symbol: 'BTCUSD' })
                .then(response => {
                    debugFile(response, 'getPosition')
                    lastEntryPrice = entryPrice
                    if (lastEntryPrice != entryPrice) {
                        console.log(` Entry price changed -${Number(entryPrice - lastEntryPrice).toFixed(0)}`)
                    }
                    entryPrice = response.result.entry_price
                    liqPrice = response.result.liq_price
                    ownedContracts = response.result.size
                    unrealizedPNL = response.result.unrealised_pnl
                    walletBalance = response.result.wallet_balance
                    orderMargin = response.result.order_margin
                    positionMargin = response.result.position_margin

                    if (response.result.side == 'Sell')
                        isLongActive = false
                    else
                        isLongActive = true

                    resolve('')
                })
                .catch(err => {
                    debugFile(err, 'getPosition')
                    console.error("getPosition inverse error: ", err)
                    resolve('')
                });
        });
    }

    async function removeOlderOrders() {
        return new Promise(resolve => {

            bybitApiCalls++
            client.queryActiveOrder({ symbol: 'BTCUSD' })
                .then(async response => {
                    debugFile(response, 'queryActiveOrder')
                        //console.log("RESPONSE queryActiveOrder: ", response);
                    for (let i = 0; i < response.result.length; i++) {
                        const offer = response.result[i]
                        closeOrderByID(offer.order_id)
                    }

                }).catch(err => {
                    debugFile(err, 'queryActiveOrder')
                    console.error("removeOlderOrders queryActiveOrder inverse error: ", err)
                });

        });
    }

    async function placeActiveOrder(price) {

        return new Promise(resolve => {

            activeOrderExists = false;
            bybitApiCalls++
            client.queryActiveOrder({ symbol: 'BTCUSD' })
                .then(async response => {
                    debugFile(response, 'placeActiveOrder/queryActiveOrder')
                        //console.log("RESPONSE queryActiveOrder: ", response);
                    for (let i = 0; i < response.result.length; i++) {
                        //console.log('OFFERS LIST')
                        const offer = response.result[i]

                        if (offer.order_id == lastOrderId.toString()) {
                            activeOrderExists = true
                        }
                    }
                    /*                     console.log('pdist                 ' + Math.abs(Number(pdist)))
                                        console.log('minPriceDistanceOrder ' + minPriceDistanceOrder)
                                        console.log('result                ' + (Math.abs(Number(pdist)) < Number(minPriceDistanceOrder)))
                     */


                    if (activeOrderExists) {
                        process.stdout.write(`Order`.grey.bgBlack)
                            //process.stdout.write(`${lastOrderId}`.brightBlue.bgBlack)
                        process.stdout.write(`@`.brightGreen.bgBlack)
                        process.stdout.write(`${lastOrderPrice.toFixed(2)}`.brightYellow.bgBlack)
                        process.stdout.write(`x`.green.bgBlack)
                        process.stdout.write(`${lastOrderQty}`.brightGreen.bgBlack)
                        console.log()

                    } else if ((Math.abs(Number(pdist)) < Number(minPriceDistanceOrder)) && pdist != lastPrice && !autoManageOrderPrice) {

                        process.stdout.write(`Min pdist: ${minPriceDistanceOrder}`.yellow.bgBlack)
                        console.log()

                    } else if (Number(pdist) > -5) {
                        process.stdout.write(`Price too close @ ${Number(pdist).toFixed(2).brightYellow.bgBlack} `)
                        console.log()

                    } else {
                        //process.stdout.write(`Order @ ${price.toFixed(2).brightYellow.bgBlack}`.brightYellow.bgBlack)
                        //process.stdout.write(`offerOffsetDown is ${offerOffsetDown.toFixed(2)}`.brightYellow.bgBlack)

                        bybitApiCalls++

                        client.placeActiveOrder({ order_type: 'Limit', side: 'Buy', symbol: 'BTCUSD', qty: qtdContractsToBuy, price: price, time_in_force: 'GoodTillCancel' })
                            .then(response => {
                                debugFile(response, 'placeActiveOrder')
                                    //console.log("RESPONSE: ", response)
                                lastOrderId = response.result.order_id
                                lastOrderPrice = response.result.price
                                lastOrderCreatedAt = response.result.created_at
                                lastOrderQty = response.result.qty
                                lastOfferDate = new Date()
                                resolve('')
                            })
                            .catch(err => {
                                debugFile(err, 'placeActiveOrder')
                                console.error("placeActiveOrder error: ", err)
                                resolve('')
                            });
                    }

                }).catch(err => {
                    debugFile(err, 'placeActiveOrder')
                    console.error("queryActiveOrder inverse error: ", err)
                });


        })
    }

    async function closePosition(price) {

        await getPosition()

        return new Promise(resolve => {



            if (qtdContractsToClosePosition > ownedContracts) {
                qtdContractsToClosePosition = ownedContracts + 1
            }

            //console.log('rck0 ' + qtdContractsToClosePosition)
            if (minOwnedContractsToStartClosingPosition != 0 && ownedContracts < minOwnedContractsToStartClosingPosition) {
                process.stdout.write(` [ACP] Min Contracts is ${minOwnedContractsToStartClosingPosition}`.brightRed.bgBlack)
                    //console.log('rck1')

            } else if (qtdContractsToClosePosition > 0) {
                //console.log('rck2')

                let qtdClosePositionOrders = 0

                client.queryActiveOrder({ symbol: 'BTCUSD' })
                    .then(async response => {

                        debugFile(response, 'closePosition/queryActiveOrder')
                            //console.log("RESPONSE queryActiveOrder: ", response);

                        for (let i = 0; i < response.result.length; i++) {

                            const offer = response.result[i]

                            if (offer.side == 'Sell') {
                                qtdClosePositionOrders++
                            }

                        }
                        //console.log('rck3')
                        if (qtdClosePositionOrders == 0) {
                            //console.log('rck4')
                            bybitApiCalls++
                            client.placeActiveOrder({ order_type: 'Limit', side: 'Sell', symbol: 'BTCUSD', qty: qtdContractsToClosePosition, price: price + 1, time_in_force: 'GoodTillCancel' })
                                .then(response => {
                                    debugFile(response, 'closePosition')
                                        //console.log("RESPONSE: ", response)
                                    lastClosePositionOrderId = response.result.order_id
                                    lastClosePositionOrderPrice = response.result.price
                                    lastClosePositionOrderCreatedAt = response.result.created_at
                                })
                                .catch(err => {
                                    debugFile(err, 'closePosition')
                                    console.error("closePosition error: ", err)
                                });

                        }
                        //console.log('rck6')

                    }).catch(err => {
                        debugFile(err, 'placeActiveOrder')
                        console.error("queryActiveOrder inverse error: ", err)
                    });

            }
            resolve('')
        });
    }

    async function avoidLiquidation(price) {

        return new Promise(resolve => {
            bybitApiCalls++
            client.placeActiveOrder({ order_type: 'Limit', side: 'Buy', symbol: 'BTCUSD', qty: liquidationQtdOffer, price: price, time_in_force: 'GoodTillCancel' })
                .then(response => {
                    debugFile(response, 'avoidLiquidation')
                        //console.log("RESPONSE: ", response)
                        //lastClosePositionOrderId = response.result.order_id
                    resolve('')
                })
                .catch(err => {
                    debugFile(err, 'avoidLiquidation')
                    console.error("avoidLiquidation error: ", err)
                    resolve('')
                });

        });
    }


    async function closeOrderByID(orderId) {
        return new Promise(resolve => {

            client.cancelActiveOrder({ symbol: 'BTCUSD', order_id: orderId })
                .then(response => {
                    debugFile(response, 'closeOrderByID')
                        //console.log("RESPONSE removeOrderById : ", response)
                    resolve('')
                })
                .catch(err => {
                    debugFile(err, 'closeOrderByID')
                    console.error("cancelActiveOrder error: ", err)
                    resolve('')
                });

        });
    }

    async function calculations() {

        return new Promise(resolve => {

            pdist = Number(lastPrice - entryPrice).toFixed(2)
            if (Number(pdist) >= Number(pdistMax)) pdistMax = pdist
            if (Number(pdist) <= Number(pdistMin)) pdistMin = pdist


            ldist = Number(lastPrice - liqPrice);

            let lastCommand = command;

            //prevent liquidation
            if (ldist > 0 && ldist < liquidationDistAlert) {
                command = 'Avoiding Liquidation!'


            } else if (pdist > considerClosingPositionPriceDistance) { // TODO is not working

                command = 'take profit!'

            } else {
                command = '';

                if (lastPrice > entryPrice) // quando o valor ainda é maior que o valor da posicao
                    command = 'Looking'.yellow.bgBlack + '@'.brightYellow.bgBlack + Number(lowPriceGoodToBuy1).toFixed(2).toString().yellow.bgBlack

                if ((Math.abs((entryPrice - lastPrice))) > priceDiffMark_1) // quando atinge a diferenca desejada para comprar mais Mark_1
                    command = 'Mark #1';

                if ((Math.abs((entryPrice - lastPrice))) > priceDiffMark_2)
                    command = 'Mark #2';

                if ((Math.abs((entryPrice - lastPrice))) > priceDiffMark_3)
                    command = 'Mark #3';

                if (autoRaiseOffer) {
                    autoRaiseAmount = Number(lowPrice24h) + Number((runningCycles * autoRaiseOfferIncrement))
                }

                if (autoManageOrderPrice) {
                    // Verifica se o momento atual é oportuno para criar oferta
                    if (pdist < 0 && Math.abs(pdist) >= autoMinPriceDistance) {
                        command = `Auto`;
                    }
                } else if (Number(lastPrice) <= Number(lowPriceGoodToBuy1)) {
                    command = 'GBuy @ ' + lowPriceGoodToBuy1.toFixed(2);
                }


            }

            command.substring(0, 5) != lastCommand.substring(0, 5) ? commandChanged = true : commandChanged = false;

            if (runningCycles > minCyclesExperience) {

                priceHistory.push(lastPrice)

                //console.log('priceHistory : ' + priceHistory)
                if (priceHistory.length == 10) {
                    //console.log('p1 : ' + priceHistory[0])
                    //console.log('p2 : ' + priceHistory[9])
                    let d = priceHistory[9] - priceHistory[0]
                        //console.log('d : ' + d)
                        //console.log('p : ' + ((d / priceHistory[0]) * 100))
                    priceHistory.splice(0, 1);
                }

                //console.log(new Array(...priceHistory).join(' '));

                PLNonRealized = (unrealizedPNL / positionMargin) * 100;

                PLNonRealizedOFTotal = (unrealizedPNL / walletBalance) * 100;

                bybitApiCallsPerMinute = (bybitApiCalls / ((new Date().getTime() - dtCalcApiCals.getTime()) / 1000) * 60)


                if (lastOrderCreatedAt != null) {
                    let dt = new Date(lastOrderCreatedAt)
                    let timePassedOfActiveOrder = new Date().getTime() - dt.getTime()

                    if (timePassedOfActiveOrder > (ancientOrderMinutes * 1000 * 60)) {
                        closeOrderByID(lastOrderId)
                    }
                }

                if (lastClosePositionOrderCreatedAt != null) {
                    let dtlcp = new Date(lastClosePositionOrderCreatedAt)
                    let timePassedOfClosePositionActiveOrder = new Date().getTime() - dtlcp.getTime()
                    if (timePassedOfClosePositionActiveOrder > (ancientClosePositionOrderMinutes * 1000 * 60)) {
                        closeOrderByID(lastClosePositionOrderId)
                    }
                }



            }
            resolve('');
        });
    }

    async function printLog() {

        if (headerCounter >= headerInterval || headerCounter == 0 || commandChanged) {
            //sound.play("D:\\workspace\\bybit\\bemtevi.mp3", 0.2);

            process.stdout.write(' ' + Number(bybitApiCallsPerMinute).toFixed(0).toString().grey.bgBlack + '/m'.grey.bgBlack)

            process.stdout.write(` wb=${walletBalance} om=${orderMargin} pm=${positionMargin} m%=${PLNonRealized.toFixed(2)}% t%=${PLNonRealizedOFTotal.toFixed(2)}%`.grey.bgBlack)

            process.stdout.write(" [AR:".grey.bgBlack) //AutoRaise
            if (autoRaiseAmount > lastPrice)
                process.stdout.write(Number(autoRaiseAmount).toFixed(2).brightYellow.bgBlack)
            else
                process.stdout.write(Number(autoRaiseAmount).toFixed(2).grey.bgBlack)

            process.stdout.write("]".grey.bgBlack)

            console.log()

            utils.printCurrPriceBars(highPrice24h, lowPrice24h, lastPrice)

            process.stdout.write(` e`.yellow.bgBlack)
            process.stdout.write(`@`.brightYellow.bgBlack)
            process.stdout.write(Number(entryPrice).toFixed(2).yellow.bgBlack)
            process.stdout.write(` cp`.yellow.bgBlack)
            process.stdout.write(`@`.brightYellow.bgBlack)
            process.stdout.write((Number(entryPrice) + Number(considerClosingPositionPriceDistance)).toFixed(2).yellow.bgBlack)
            process.stdout.write(` l`.yellow.bgBlack)
            process.stdout.write(`@`.brightYellow.bgBlack)
            process.stdout.write(Number(liqPrice).toFixed(2).yellow.bgBlack)
            process.stdout.write(` ${Number((((new Date().getTime() - dtStartApiCals) / 1000) / 60) / 60).toFixed(2)}`.grey.bgBlack + 'h')
            process.stdout.write(` c`.grey.bgBlack)
            process.stdout.write(`=`.white.bgBlack)
            process.stdout.write(`${autoManageOrderPrice}`.grey.bgBlack)
            process.stdout.write(`;`.brightWhite.bgBlack)
            process.stdout.write(`${autoMinPriceDistance}`.grey.bgBlack)
            process.stdout.write(`;`.brightWhite.bgBlack)
            process.stdout.write(`${considerClosingPositionPriceDistance}`.grey.bgBlack)

            process.stdout.write(` a`.grey.bgBlack)
            process.stdout.write(`=`.white.bgBlack)
            process.stdout.write(`${activeOrderExists}`.grey.bgBlack)

            console.log()
            headerCounter = 0
        }
        headerCounter++;

        // inicio calculo foguinho
        if (runningCycles > 1) {
            if (Math.abs(lastLastPrice - lastPrice) > highChangeThreshold)
                foguinho = '*';
            else
                foguinho = ' ';
        }
        // fim calculo foguinho

        process.stdout.write(foguinho.brightYellow.bgBlack)
        if (Number(lastPrice) > Number(lastLastPrice))
            process.stdout.write(lastPrice.green.bgBlack)
        else if (Number(lastPrice) < Number(lastLastPrice))
            process.stdout.write(lastPrice.red.bgBlack)
        else
            process.stdout.write(lastPrice.grey)

        process.stdout.write(foguinho.brightYellow.bgBlack)

        if (Number(pdist) >= Number(pdistMax)) {
            process.stdout.write(utils.indent(Number(pdist).toFixed(0), 4, true).brightYellow.bgBlue)
        } else if (Number(pdist) <= Number(pdistMin)) {
            process.stdout.write(utils.indent(Number(pdist).toFixed(0), 4, true).brightYellow.bgRed)
        } else if (Number(pdist) > 0)
            process.stdout.write(utils.indent(Number(pdist).toFixed(0), 4, true).brightYellow.bgBlack)
        else
            process.stdout.write(utils.indent(Number(pdist).toFixed(0), 4, true).grey.bgBlack)

        process.stdout.write(' '.grey.bgBlack)
            //process.stdout.write(Math.abs(Number(pdistMax - pdistMin).toFixed(0)).toString().grey.bgBlack)
        process.stdout.write(Math.abs(Number(pdistMin).toFixed(0)).toString().brightRed.bgBlack)
        process.stdout.write(Math.abs(Number(pdistMax).toFixed(0)).toString().cyan.bgBlack)
        process.stdout.write(' '.grey.bgBlack)
        utils.printPriceRangeBars(entryPrice, lastPrice, considerClosingPositionPriceDistance, priceDistThreshold, isLongActive)
        process.stdout.write('|'.grey.bgBlack)
        utils.printLiqBars(lastPrice, liqPrice, liqBarsThreshold)
        process.stdout.write(' ')
        process.stdout.write(ownedContracts.toString().yellow.bgBlack)
        if (Number(unrealizedPNL) > 0)
            process.stdout.write(" " + utils.indent(unrealizedPNL, 10, false).toString().brightYellow.bgBlack)
        else
            process.stdout.write(" " + utils.indent(unrealizedPNL, 10, false).toString().brightRed.bgBlack)

        process.stdout.write(' ' + Number(PLNonRealized).toFixed(2).toString().brightYellow.bgBlue + '%'.grey.bgBlack)
        process.stdout.write(' '.bgBlack)

        if (command.search("Avoiding Liquidation!") == 0) {
            process.stdout.write(command.brightYellow.bgRed)
            avoidLiquidation(lastPrice)
        } else if (command.search("GBuy") == 0 || command.search("Auto") == 0) {
            process.stdout.write(command.brightGreen.bgBlack)
            process.stdout.write("_ ".grey.bgBlack)
            if (ownedContracts >= maxOwnContracts) {
                process.stdout.write(`maxOwnContracts reached.`)
            } else if (lastOfferDate != null && (new Date().getTime() - lastOfferDate.getTime() < minDelayBetweenOrders)) {
                process.stdout.write(`Delay ${new Date().getTime() - lastOfferDate.getTime()} of ${minDelayBetweenOrders}`)
            } else if (runningCycles < minRunningCyclesToPlaceOrder) {
                process.stdout.write(`runningCycles is ${runningCycles} of ${minRunningCyclesToPlaceOrder} `)
            } else {

                if (command.search("Auto") == 0) offerOffsetDown = autoOfferOffsetDown

                if (command.search("Auto") == 0 || command.search("GBuy") == 0) // Protecao para nao executar em outros comandos
                    await placeActiveOrder(Number(lastPrice) - Number(offerOffsetDown))
            }

        } else if (command.search("take profit!") == 0) {
            process.stdout.write(command.brightYellow.bgBlack)
                //console.log('AUTO CLOSING POSITION :)')
            await closePosition(Number(lastPrice) - 1)
        } else {
            process.stdout.write(command.yellow.bgBlack)
        }

        process.stdout.write(" ".grey.bgBlack)

        console.log();

    }

    function printLogFile() {

        let dtnow = new Date()

        let logOutput = dtnow.toString().replace('GMT-0300 (Brasilia Standard Time)', '')
        logOutput = logOutput + "owned:" + ownedContracts + " "
        logOutput = logOutput + "entryPrice:" + Number(entryPrice).toFixed(2) + " "
        logOutput = logOutput + "liqPrice:" + Number(liqPrice).toFixed(2) + " "
        logOutput = logOutput + "PLNonRealized:" + Number(PLNonRealized).toFixed(2)
        logOutput = logOutput + "lastPrice:" + Number(lastPrice).toFixed(2) + " \n"

        fs.appendFile('bybit.log', logOutput, (err) => {
            if (err) throw err;
            //console.log('Log file updated!');
        });

    }

    function debugFile(object, source) {

        let dict = new Set(excludeFromDebugLog)

        if (!dict.has(source)) {
            let logOutput = "[" + source + "] \n"
            logOutput = logOutput + JSON.stringify(object, null, 2) + "}] \n"

            fs.appendFile('debug.log.json', logOutput, (err) => {
                if (err) throw err;
                //console.log('Debug file updated!');
            });

        }

    }
}