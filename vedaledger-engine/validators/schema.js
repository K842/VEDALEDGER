const Joi = require('joi');

// Helper for GPS coordinates (Latitude, Longitude)
// Matches formats like "20.1485, 85.6761"
const gpsRegex = /^-?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*-?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;

const schemas = {
    // Phase 1: Farmer Harvest Input
    harvestSchema: Joi.object({
        species: Joi.string().valid('Ashwagandha', 'Tulsi', 'Brahmi', 'Giloy').required(),
        quantity: Joi.number().integer().min(1).max(5000).required(), // Max 5 tons per harvest
        score: Joi.number().integer().min(0).max(100).required(),
        metadata: Joi.object({
            farmerName: Joi.string().min(3).max(50).required(),
            gps: Joi.string().pattern(gpsRegex).required().messages({
                'string.pattern.base': 'Invalid GPS format. Use "Lat, Long" (e.g., 20.14, 85.67)'
            }),
            soilPh: Joi.number().min(0).max(14).optional(),
            harvestDate: Joi.date().iso().max('now').required()
        }).required()
    }),

    // Phase 2: Aggregator Batching Input
   batchSchema: Joi.object({
    collectionIds: Joi.array().items(Joi.number().integer().required()).min(2).required(),
    species: Joi.string().valid('Ashwagandha', 'Tulsi', 'Brahmi', 'Giloy').required(),
    location: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(), // Add this to match your middleware
    score: Joi.number().integer().min(0).max(100).required() // Add this to match your middleware
}),
    // Phase 3: Lab Testing Input
    labSchema: Joi.object({
        batchId: Joi.number().integer().required(),
        purityValue: Joi.number().min(0).max(100).required(),
        secretSalt: Joi.string().hex().length(64).required(), // For ZK-Commitment
        passed: Joi.boolean().required(),
        testReportHash: Joi.string().optional() // CID of the Encrypted PDF
    }),

    // Phase 5: Manufacturing Input
    manufactureSchema: Joi.object({
        batchId: Joi.number().integer().required(),
        unitCount: Joi.number().integer().min(1).max(10000).required(),
        mgPerUnit: Joi.number().integer().min(10).max(2000).required(),
        extractionRatio: Joi.number().integer().min(1).max(20).default(1)
    })
};

module.exports = schemas;