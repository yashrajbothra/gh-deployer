'use strict';

import logger from '@src/logger';
import { Docker } from 'node-docker-api';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
import data from '@src/data';

const createAliasesFromString = (aliasString: string | null | undefined) => {
    aliasString = aliasString || '';
    var networksAndAliases = aliasString.split(','); // Cut each part
    var netAlias: {
        [alias: string]: {
            Aliases: string[];
        };
    } = {};
    networksAndAliases
        .map(value => value.split('!')) // Cut networkName and aliases
        .map(value => {
            if (value[0] !== '' && value[1] !== '') {
                netAlias[value[0].trim()] = {
                    Aliases: value[1].split(';').map(alias => alias.trim()),
                };
            }
        });
    return netAlias;
};

const labelNamespace = 'fr.wdes.sudo.gh-deployer';

export default {
    createAliasesFromString: createAliasesFromString,
    createDocker: (
        prId: number,
        cloneUrl: string,
        ref: string,
        sha: string,
        compiledPhpMyAdminConfig: string,
        randomString: string
    ) => {
        return new Promise((resolve, reject) => {
            try {
                const containerName = data.replaceTokens(
                    {
                        prId: prId,
                        ref: ref,
                        sha: sha,
                    },
                    process.env.DOCKER_CONTAINER_NAME || ''
                );
                docker.container
                    .get(containerName)
                    .stop()
                    .then(function(container) {
                        return container.delete({ force: true });
                    })
                    .catch(function(err) {
                        if (err.statusCode === 404) {
                            logger.info('Container ' + containerName + ' not found.');
                        } else {
                            logger.error(err);
                            reject(err);
                        }
                    })
                    .then(function() {
                        logger.info('Deploying: ', containerName);
                        var optionalHostConfig: any = {};
                        if (process.env.DOCKER_MEMORY && process.env.DOCKER_MEMORY != '0') {
                            optionalHostConfig.Memory = parseInt(process.env.DOCKER_MEMORY) * 1000000;
                        }
                        const networkAliases = data.replaceTokens(
                            {
                                prId: prId,
                                ref: ref,
                                sha: sha,
                            },
                            process.env.DOCKER_NETWORK_ALIASES || ''
                        );
                        const hostName = data.replaceTokens(
                            {
                                prId: prId,
                                ref: ref,
                                sha: sha,
                            },
                            process.env.DOCKER_CONTAINER_HOSTNAME || ''
                        );
                        docker.container
                            .create({
                                Image: process.env.DOCKER_IMAGE,
                                name: containerName,
                                Hostname: hostName,
                                Domainname: data.replaceTokens(
                                    {
                                        prId: prId,
                                        ref: ref,
                                        sha: sha,
                                    },
                                    process.env.DOCKER_DOMAIN_NAME || ''
                                ),
                                Volumes: (process.env.DOCKER_VOLUMES || '').split(',').reduce(
                                    (accumulator, target) => ({
                                        ...accumulator,
                                        [target]: {},
                                    }),
                                    {}
                                ),
                                WorkingDir: process.env.DOCKER_WORKDIR,
                                HostConfig: {
                                    DnsSearch: (process.env.DOCKER_DNS_SEARCH || '').split(','),
                                    NetworkMode: process.env.DOCKER_NETWORK_MODE,
                                    Binds: (process.env.DOCKER_BINDS || '').split(','),
                                    ...optionalHostConfig,
                                },
                                Entrypoint: process.env.DOCKER_ENTRYPOINT,
                                Env: [
                                    'REF_DIRECTORY=/refs',
                                    'GIT_URL=' + cloneUrl,
                                    'GIT_BRANCH=origin/' + ref,
                                    'GIT_SHA=' + sha,
                                    'RANDOM_STRING=' + randomString,
                                    'PMA_CONFIG=' + compiledPhpMyAdminConfig,
                                ],
                                NetworkingConfig: {
                                    EndpointsConfig: createAliasesFromString(networkAliases),
                                },
                                Labels: {
                                    [labelNamespace]: 'true',
                                    [labelNamespace + '.git-url']: cloneUrl,
                                    [labelNamespace + '.git-ref']: ref,
                                    [labelNamespace + '.git-sha']: sha,
                                    [labelNamespace + '.github-type']: 'pull-request',
                                    [labelNamespace + '.github-pr-id']: '' + prId,
                                    [labelNamespace + '.public-dns-hostname']: hostName,
                                },
                            })
                            .then(container => container.start())
                            .then(container => {
                                container
                                    .status()
                                    .then(status => {
                                        resolve({
                                            status: status,
                                            containerName: containerName,
                                        });
                                    })
                                    .catch(error => reject(error));
                            })
                            /*.then(container => container.stop())
                        .then(container => container.restart())
                        .then(container => container.delete({ force: true }))*/
                            .catch(error => reject(error));
                    });
            } catch (error) {
                reject(error);
            }
        });
    },
};
