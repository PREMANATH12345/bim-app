import db from "../db.js";

export const UserName = (req, res) => {
    const { name } = req.body;
    console.log(name)
}