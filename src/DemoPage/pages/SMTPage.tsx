import { Typography } from "antd";
import img21 from "../../assets/img_21.png"
import img22 from "../../assets/img_22.png"

const SMTPage = () => {

    return <>
        <Typography.Paragraph>
            Block is Not SMC . Order Block just additional Confirmation for buy or sell . when you
            look any order Block then dont trade blindly you have to wait for inducement or Liquidity
            sweep Clear Confirmation before buy sell on Order block . Let see how it work .
        </Typography.Paragraph>
        <img src={img21}/>
        <img src={img22}/>
    </>
}

export default SMTPage;