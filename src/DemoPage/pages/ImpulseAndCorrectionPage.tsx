import {Typography} from "antd";
import img from "../../assets/img.png"
import img_1 from "../../assets/img_1.png"
import img_2 from "../../assets/img_2.png"

const ImpulseAndCorrectionPage = () => {

    return <>
        <Typography.Paragraph>When Market momentum is very strong to the upside or downside those types strong

            unhealthy price action is called Impulsive Move, Price generally move in two way impulse and

            correction. you can understand like this in impulsive move lots of institutional and Banks

            Buying Momentum and correction phase retail traders trying to buy sell and market move in a

            particular range. Now i am going to explain you here in details that how its looks.</Typography.Paragraph>
        <img src={img}/>
        <img src={img_1}/>
        <Typography.Paragraph>
            When Price taken out Prev Candle High / Low then candle colors not matter may be Bullish or bearish in both
            scenarios are valid. one more thing Price taken out High/Low then sometimes candle close or Sweep Prev
            Candle High Low . Both scenarios are valid.
        </Typography.Paragraph>
        <img src={img_2}/>
    </>
}

export default ImpulseAndCorrectionPage;