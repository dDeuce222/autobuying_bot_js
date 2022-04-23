module.exports = {
    indent: function(text, spaces, indentLeft) {

        let ret = text;
        if (text.toString().length > spaces) { return text.toString().substring(0, spaces + 1); }
        for (let i = spaces; i >= text.toString().length; i--) {

            if (indentLeft)
                ret = ' ' + ret
            else ret = ret + ' '
        }
        return ret;
    },
    printLiqBars: function(lastPrice, liqPrice, liqBarsThreshold, isLongActive) {

        let diff = Number((lastPrice - liqPrice))
        let percentual = (diff * 100) / liqBarsThreshold

        if (isLongActive) {
            if (percentual > 10)
                process.stdout.write("l".brightGreen.bgBlack)
            else
                process.stdout.write("l".red.bgBlack)

            if (percentual > 20)
                process.stdout.write("i".brightGreen.bgBlack)
            else
                process.stdout.write("i".red.bgBlack)

            if (percentual > 30)
                process.stdout.write("q".brightGreen.bgBlack)
            else
                process.stdout.write("q".red.bgBlack)

            if (percentual > 40)
                process.stdout.write("u".brightGreen.bgBlack)
            else
                process.stdout.write("u".red.bgBlack)

            if (percentual > 50)
                process.stdout.write("i".brightGreen.bgBlack)
            else
                process.stdout.write("i".red.bgBlack)

            if (percentual > 60)
                process.stdout.write("d".brightGreen.bgBlack)
            else
                process.stdout.write("d".red.bgBlack)

            if (percentual > 70)
                process.stdout.write("a".brightGreen.bgBlack)
            else
                process.stdout.write("a".red.bgBlack)

            if (percentual > 80)
                process.stdout.write("t".brightGreen.bgBlack)
            else
                process.stdout.write("t".red.bgBlack)

            if (percentual > 90)
                process.stdout.write("i".brightGreen.bgBlack)
            else
                process.stdout.write("i".red.bgBlack)

            if (percentual > 100)
                process.stdout.write("o".brightGreen.bgBlack)
            else
                process.stdout.write("o".red.bgBlack)

            if (percentual > 110)
                process.stdout.write("n".brightGreen.bgBlack)
            else
                process.stdout.write("n".red.bgBlack)

        } else {
            process.stdout.write("shortExit()".brightYellow.bgRed)
        }




    },
    printCurrPriceBars: function(max24h, min24h, lastPrice) {

        currPriceBarsThreshold = max24h - min24h;

        let diff = Number((lastPrice - min24h))
        let percentual = (diff * 100) / currPriceBarsThreshold

        let barras = 13
        let barpercent = percentual / 10
            //console.log('percentual:' + percentual)
            //console.log('barpercent:' + barpercent)

        for (let i = 1; i < barras + 1; i++) {
            //console.log(barpercent * i)
            //console.log((barpercent * i) > percentual)
            if (percentual > (barpercent * i)) {
                process.stdout.write("≡".brightGreen.bgBlack)
            } else {
                process.stdout.write("≡".brightRed.bgBlack)
            }
        }


    },
    printFancyPrice: function(colors, maincolor, seccolor, centscolot, text) {
        //console.log('text : ' + text)

        colors.setTheme({
            out: maincolor,
            light: seccolor,
            cents: centscolot
        });

        process.stdout.write(text.substring(0, text.indexOf('.')).out.bgBlack)
        process.stdout.write('.'.light.bgBlack)
        process.stdout.write(text.substring(text.indexOf('.') + 1, text.length).cents.bgBlack)


    },

    printPriceRangeBars: function(entry, lastPrice, range, priceDistThreshold, isLongActive) {

        let diff = Math.abs(Number((lastPrice - entry)))
        let percentual = 0;

        if (Number((lastPrice - entry)) < 0) {
            //console.log('cinza ' + Number((lastPrice - entry)))
            percentual = (diff / priceDistThreshold) * 100

            if (percentual < 90)
                process.stdout.write("p".cyan.bgBlack)
            else
                process.stdout.write("p".brightRed.bgBlack)

            if (percentual < 65)
                process.stdout.write("r".cyan.bgBlack)
            else
                process.stdout.write("r".brightRed.bgBlack)

            if (percentual < 50)
                process.stdout.write("o".cyan.bgBlack)
            else
                process.stdout.write("o".brightRed.bgBlack)

            if (percentual < 20)
                process.stdout.write("f".cyan.bgBlack)
            else
                process.stdout.write("f".brightRed.bgBlack)

            if (percentual < 5)
                process.stdout.write("i".cyan.bgBlack)
            else
                process.stdout.write("i".brightRed.bgBlack)

            process.stdout.write("t".brightRed.bgBlack)


        } else {

            //console.log('normal ' + Number((lastPrice - entry)))

            if (diff > range && !isLongActive) {
                process.stdout.write(" LONG ".yellow.bgRed)
            } else if (diff > range) {
                process.stdout.write(" SELL ".brightYellow.bgBlue)

            } else {
                percentual = (diff / range) * 100
                    //console.log('percentual ' + percentual)


                if (percentual > 0)
                    process.stdout.write("p".brightYellow.bgBlack)
                else
                    process.stdout.write("p".cyan.bgBlack)

                if (percentual > 20)
                    process.stdout.write("r".brightYellow.bgBlack)
                else
                    process.stdout.write("r".cyan.bgBlack)

                if (percentual > 50)
                    process.stdout.write("o".brightYellow.bgBlack)
                else
                    process.stdout.write("o".cyan.bgBlack)

                if (percentual > 65)
                    process.stdout.write("f".brightYellow.bgBlack)
                else
                    process.stdout.write("f".cyan.bgBlack)

                if (percentual > 90)
                    process.stdout.write("i".brightYellow.bgBlack)
                else
                    process.stdout.write("i".cyan.bgBlack)

                process.stdout.write("t".cyan.bgBlack)

            }

        }

    }

};