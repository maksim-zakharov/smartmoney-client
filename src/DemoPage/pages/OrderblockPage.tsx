import {Typography} from "antd";
import img15 from "../../assets/img_15.png"
import img16 from "../../assets/img_16.png"
import img17 from "../../assets/img_17.png"
import img18 from "../../assets/img_18.png"

const OrderblockPage = () => {

    return <>
        <Typography.Paragraph>
            Order Block is main Part in Smart Money Concept during entries . Order Block means where
            Smart Traders Entered for buys and sells . to mark any Bullish / Bearish Order Block Price must
            be proper imbalance and taken out Prev Candle High Low to confirm Order Block .Now we
            are going to discuss in more details that how we can identify and trade it. price generally
            react from Decesional Order Block or Extreme Order block .
        </Typography.Paragraph>
        <img src={img15}/>
        <img src={img16}/>
        <Typography.Paragraph>
            Now you can understand more better clearly that how things actually work in order Block , to
            mark oder Block Proper imbalance and Liquidity Sweep Order Block .in upcoming chapters
            we 'll discuss Entries Parts in more details . these are just examples to identify valid OB .
        </Typography.Paragraph>
        <img src={img17}/>
        <img src={img18}/>
    </>
}

export default OrderblockPage;