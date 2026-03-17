const Report = require('../models/Report');
const User = require('../models/User');
const mongoose = require('mongoose');

exports.getAnalytics = async (req, res) => {
    try {
        const pathologyId = req.user.id;

        // 1. Total Reports & Total Patients
        const totalReports = await Report.countDocuments({ pathologyId });
        const totalPatientsArray = await Report.distinct('patientId', { pathologyId });
        const totalPatients = totalPatientsArray.length;

        // 2. Weekly Report Volume (Last 7 days)
        const weeklyVolume = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - i);

            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);

            const count = await Report.countDocuments({
                pathologyId,
                uploadDate: { $gte: date, $lt: nextDate }
            });
            weeklyVolume.push(count);
        }

        // 3. Patient Growth Rate (This 30 days vs Last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const currentPatients = await Report.distinct('patientId', {
            pathologyId,
            uploadDate: { $gte: thirtyDaysAgo }
        });

        const previousPatients = await Report.distinct('patientId', {
            pathologyId,
            uploadDate: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
        });

        let growthRate = 0;
        if (previousPatients.length > 0) {
            growthRate = ((currentPatients.length - previousPatients.length) / previousPatients.length) * 100;
        } else if (currentPatients.length > 0) {
            growthRate = 100;
        }

        // 4. Lab Efficiency Metrics
        const processedReports = await Report.countDocuments({ pathologyId, ocrProcessed: true });
        const efficiencyRate = totalReports > 0 ? (processedReports / totalReports) * 100 : 0;

        // 5. Test Type Distribution
        const testTypeStats = await Report.aggregate([
            { $match: { pathologyId: new mongoose.Types.ObjectId(pathologyId) } },
            { $group: { _id: '$testType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            weeklyVolume,
            patientGrowthRate: Math.round(growthRate),
            efficiencyRate: Math.round(efficiencyRate),
            totalReports,
            totalPatients,
            testTypes: testTypeStats.map(t => ({ name: t._id, count: t.count }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching analytics', error: error.message });
    }
};
