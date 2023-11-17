const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.post('/split-payments/compute', (req, res) => {
    try {


        const { ID, Amount, Currency, CustomerEmail, SplitInfo } = req.body;

        if (SplitInfo.length < 1 || SplitInfo.length > 20) {
            return res.status(400).json({ error: 'SplitInfo must contain between 1 and 20 entities.' });
        }

        SplitInfo.sort((a, b) => {
            const order = { FLAT: 1, PERCENTAGE: 2, RATIO: 3 };
            return order[a.SplitType] - order[b.SplitType];
        });

        let balance = Amount;

        let totalSplitAmount = 0;


        const splitBreakdown = [];

        for (const splitEntity of SplitInfo) {

            let splitAmount;
            if (splitEntity.SplitType === 'FLAT') {
                splitAmount = splitEntity.SplitValue;
                balance - splitAmount
            } else if (splitEntity.SplitType === 'PERCENTAGE') {

                splitAmount = (splitEntity.SplitValue / 100) * balance;
                balance - splitAmount

            } else if (splitEntity.SplitType === 'RATIO') {
                const totalRatio = SplitInfo
                    .filter(entity => entity.SplitType === 'RATIO')
                    .reduce((total, entity) => total + entity.SplitValue, 0);

                splitAmount = (splitEntity.SplitValue / totalRatio) * balance;
                balance - splitAmount



            }
            balance - splitAmount;

            totalSplitAmount += splitAmount;


            if (totalSplitAmount > Amount) {
                return res.status(400).json({ error: 'Sum of split amounts cannot be greater than the transaction amount.' });
            }

            if (splitAmount > balance) {
                return res.status(400).json({ error: 'Split amount cannot be greater than the remaining balance.' });
            }

            if (splitAmount < 0) {
                return res.status(400).json({ error: 'Split amount cannot be less than 0.' });
            }
            balance = Math.max(balance - splitAmount, 0);
            if (balance < 0) {
                return res.status(400).json({ error: 'Final balance cannot be less than 0.' });
            }

            splitBreakdown.push({
                SplitEntityId: splitEntity.SplitEntityId,
                Amount: splitAmount,
            });
        }


        const response = {
            ID,
            Balance: balance,
            SplitBreakdown: splitBreakdown,
        };

        res.status(200).json(response);
    } catch (error) {

        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
