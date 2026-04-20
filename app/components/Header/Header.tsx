import React from "react";
import styles from './Header.module.css';
import Link from "next/link";


export default function Header() {

    return (
        <article className={styles.header_container}>
            <img src="assets/lghorba_logo.png" alt="lghorba logo" />
            <section>
                <ul>
                    <li><Link href={"/cars"}>Cars</Link></li>
                    <li><Link href={"contact"} >Contact</Link></li>
                    <li><Link href={"about_us"}>About us</Link></li>
                    <li><Link href={"resources"}>Resources</Link></li>
                    <li><Link href={"news"}>News</Link></li>
                    <li><Link href={"divers"}>Divers</Link></li>
                </ul>
            </section>
        </article>
    )
}