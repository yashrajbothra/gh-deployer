'use strict';

const logger = require('@src/logger');
const cf = require('cloudflare')({
    email: process.env.CLOUDFLARE_EMAIL,
    key: process.env.CLOUDFLARE_KEY,
});

const data = require('@src/data');

module.exports = {
    publishDnsRecord: (containerName, prId, ref, sha) => {
        return new Promise((resolve, reject) => {
            let domainName = data.replaceTokens(
                {
                    containerName: containerName,
                    prId: prId,
                    ref: ref,
                    sha: sha,
                },
                '' + process.env.CLOUDFLARE_RECORD_NAME
            );
            cf.dnsRecords
                .add(process.env.CLOUDFLARE_ZONEID, {
                    type: 'A',
                    name: domainName,
                    content: process.env.CLOUDFLARE_RECORD_CONTENT,
                    proxied: true,
                })
                .then(function() {
                    logger.info('Added:', domainName);
                    resolve(domainName);
                })
                .catch(function() {
                    logger.info('Not added:', domainName);
                    resolve(domainName);
                });
        });
    },
};