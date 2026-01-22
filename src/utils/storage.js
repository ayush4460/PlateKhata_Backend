// src/utils/storage.js
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const cloudinary = require('../config/cloudinary');

const isProduction = process.env.NODE_ENV === 'production';

// Initialize S3 Client for deletion operations
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

/**
 * Deletes a file from the configured storage (S3 or Cloudinary)
 * @param {string} fileUrl - The full URL of the file to delete
 * @returns {Promise<void>}
 */
const deleteFile = async (fileUrl) => {
    if (!fileUrl) return;

    try {
        if (isProduction) {
            // S3 Deletion Strategy
            // Extract key from URL
            // Expected URL format: https://[cdn-domain]/[key]
            // or https://[bucket].s3.[region].amazonaws.com/[key]
            
            let key;
            if (process.env.AWS_CDN_DOMAIN && fileUrl.includes(process.env.AWS_CDN_DOMAIN)) {
                key = fileUrl.split(process.env.AWS_CDN_DOMAIN + '/')[1];
            } else {
                // Fallback for direct S3 URLs
                const urlParts = fileUrl.split('.amazonaws.com/');
                if (urlParts.length > 1) {
                    key = urlParts[1];
                }
            }

            if (key) {
                console.log(`🗑️ Deleting from S3: ${key}`);
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key
                }));
            } else {
                console.warn('⚠️ Could not extract S3 key from URL:', fileUrl);
            }

        } else {
            // Cloudinary Deletion Strategy
            // Extract public ID from URL
            const publicId = extractPublicId(fileUrl);
            if (publicId) {
                console.log(`🗑️ Deleting from Cloudinary: ${publicId}`);
                await cloudinary.uploader.destroy(publicId);
            }
        }
    } catch (error) {
        console.error('❌ Error deleting file:', error);
        // We generally don't want to throw here to prevent blocking the main flow
        // effectively "fire and forget" for cleanup
    }
};

/**
 * Helper to extract Cloudinary public ID
 */
const extractPublicId = (url) => {
    try {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        const folder = parts[parts.length - 2];
        const publicId = `${folder}/${filename.split('.')[0]}`;
        return publicId;
    } catch (error) {
        console.error('Error extracting public ID:', error);
        return null;
    }
};

/**
 * Gets the delivery URL for a file key (S3) or simply returns the URL (Cloudinary)
 * Mostly used when we have a key and need the full CDN URL
 */
const getFileUrl = (key) => {
    if (!key) return null;
    
    // If it already looks like a URL, return it
    if (key.startsWith('http')) return key;

    if (isProduction) {
        const domain = process.env.AWS_CDN_DOMAIN || 'your-cdn-domain.cloudfront.net';
        return `https://${domain}/${key}`;
    }
    
    // For Cloudinary, we typically store the full URL, so this might not be used much
    // unless we start storing just public_ids.
    return key;
};

module.exports = {
    deleteFile,
    getFileUrl
};
