import {Typography} from "antd";
import img_47 from "../../assets/img_47.png"
import img_48 from "../../assets/img_48.png"
import img_49 from "../../assets/img_49.png"
import img_50 from "../../assets/img_50.png"
import img_51 from "../../assets/img_51.png"
import img_52 from "../../assets/img_52.png"

const MultipleTimeFramePage = () => {

    return <>
        <Typography.Paragraph>
            Multiple time frame analysis mostly we use to identify structure, trend, entry criterias and different different time frame depend on different types of trading style and different types of markets Like Forex, Crypto, Stock, indices, synthetics and more. You have to use 2 Time frame as a Day Trader. First I am going to show you FOREX Example.
        </Typography.Paragraph>
        <img src={img_47}/>
        <img src={img_48}/>
        <Typography.Paragraph>
            This is CRYPTO Market example BTC USDT and you can take any currency Pair, I used H1 as a Higher Time Frame as per Day trader and Same time frame Hl you can take in Forex Market then you should use M5 LT For confirmation .
        </Typography.Paragraph>
        <img src={img_49}/>
        <img src={img_50}/>
        <Typography.Paragraph>
        Now this is BANK NIFTY / STOCK Chart to show you that how you can trade in Multiple Time Frame . First identify POl in HTF which 2 way to identify POl . Ist one is buy or sell after taken out PDL / PDH and switch into LTF M5 for Buy/Sell confirmation. because Stock Market open for some specific time Only. so we don't need to use M15 H1 as a Day trader perspective as we do in Forex Crypto. so we should follow PDH / PDL to mark HTF POl and second is M5 HTF
        POl and Ml For entry BUT if you're following M5 as a HTF Then Mostly cases you'll see entry in Ml Single candle mitigation based. so this is Example that how you can Trade as per
        PDH/PDL Higher Time Frame POl.
        </Typography.Paragraph>
        <img src={img_51}/>
        <img src={img_52}/>
    </>
}

export default MultipleTimeFramePage;