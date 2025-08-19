import Image from "next/image";
import { logoBGC_MPI, logoBGC, logoMPI } from "@/assets/index";

import './css/Footer.css';

const Footer = () => (
  <div className="footer">
    <div className="large-screen-logo">
      <a href="https://www.bgc-jena.mpg.de/en/bgi/mdi" target="_blank" rel="noreferrer">
        <Image src={logoBGC_MPI} alt="logoMPI" height={32}/>
      </a>
    </div>
    <div className="small-screen-logo">
      <a href="https://www.bgc-jena.mpg.de/en/bgi/mdi" target="_blank" rel="noreferrer">
        <Image src={logoBGC} alt="logoBGC" height={32}/>
      </a>
    </div>
    <div className="expandable-text">
      <span>Ⓒ <a href="https://www.bgc-jena.mpg.de/person/jpoehls/2206" target='_blank' rel="noreferrer">Jeran Poehls</a>&<a href="https://lazarusa.github.io/" target='_blank' rel="noreferrer">Lazaro Alonso</a>
      </span>

    </div>
    <div className="small-screen-logo">
      <a href="https://www.bgc-jena.mpg.de/en/bgi/home" target="_blank" rel="noreferrer">
        <Image src={logoMPI} alt="logoMPI" className="small-screen-logo" height={32}/>
      </a>
    </div>
  </div>
);

export default Footer;
