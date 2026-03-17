const Report = require('../models/Report');
const User = require('../models/User');

exports.getDashboardAnalytics = async (req, res) => {
    try {
        const pathologyId = req.user.id;

        // Reports uploaded today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const startOfYesterday = new Date(startOfDay);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);

        const uploadedToday = await Report.countDocuments({
            pathologyId,
            uploadDate: { $gte: startOfDay }
        });

        const uploadedYesterday = await Report.countDocuments({
            pathologyId,
            uploadDate: { $gte: startOfYesterday, $lt: startOfDay }
        });

        // Calculate report trend
        let reportTrend = '+0%';
        if (uploadedYesterday > 0) {
            const diff = ((uploadedToday - uploadedYesterday) / uploadedYesterday) * 100;
            reportTrend = `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%`;
        } else if (uploadedToday > 0) {
            reportTrend = '+100%';
        }

        // Total reports by this pathology
        const totalReports = await Report.countDocuments({ pathologyId });

        // Total patients registered in the system
        const patientCount = await User.countDocuments({ role: 'patient' });

        // Previous patient count (rough estimate for trend: patients before today)
        const previousPatients = await Report.distinct('patientId', {
            pathologyId,
            uploadDate: { $lt: startOfDay }
        });
        const prevPatientCount = previousPatients.length;

        let patientTrend = '+0%';
        if (prevPatientCount > 0) {
            const diff = ((patientCount - prevPatientCount) / prevPatientCount) * 100;
            patientTrend = `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%`;
        } else if (patientCount > 0) {
            patientTrend = '+100%';
        }

        // Recent uploads (last 5)
        const recentUploads = await Report.find({ pathologyId })
            .populate('patientId', 'name')
            .sort({ uploadDate: -1 })
            .limit(5);

        res.json({
            uploadedToday,
            reportTrend,
            totalReports,
            totalPatients: patientCount,
            patientTrend,
            systemStatus: 'Operational',
            uptime: '99.9%',
            recentUploads: recentUploads.map(report => ({
                reportId: report._id,
                patientName: report.patientId?.name || 'Unknown Patient',
                testType: report.testType,
                uploadDate: report.uploadDate,
                fileUrl: report.fileUrl
            }))
        });
    } catch (error) {
        console.error('[ERROR] getDashboardAnalytics failed:', error);
        res.status(500).json({ message: 'Error fetching dashboard analytics', error: error.message });
    }
};
