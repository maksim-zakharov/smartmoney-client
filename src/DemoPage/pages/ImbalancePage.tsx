import {Typography} from "antd";
import img_9 from "../../assets/img_9.png"
import img_10 from "../../assets/img_10.png"
import img_11 from "../../assets/img_11.png"
import img_12 from "../../assets/img_12.png"

const ImbalancePage = () => {

    return <>
        <Typography.Paragraph>
            Price generally drop sharply or Push Higher in unhealthy Way then market try to pullback to fill
            imbalance . There are different different name Fair Value Gap / Imbalance / inefficient
            Price Action . Generally we use in During POI & Order Block Marking .You Can understand
            like this below examples .
        </Typography.Paragraph>
        <img src={img_9}/>
        <img src={img_10}/>
        <Typography.Paragraph>
            these are Given examples to find extreme imbalance Because most of the time Fill imbalance
            its not necessary to fill every time because there are lots of different factor to fill imbalance
            on specific point . imbalance mainly use during entry time to Find POI and Order Block .
        </Typography.Paragraph>
        <img src={img_11}/>
        <img src={img_12}/>
    </>
}

export default ImbalancePage;