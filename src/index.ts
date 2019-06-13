'use strict';

import logger from '@src/logger';
import deploy from '@src/deploy';
import { default as commands, COMMANDS } from '@src/commands';
import mail from '@src/mail';
import data from '@src/data';

logger.debug('Training...');
commands
    .train()
    .then(() => {
        logger.debug('End of training');
        new mail(emailInfos => {
            logger.debug('New email', emailInfos);
            if (emailInfos.requestedByUser === process.env.ROBOT_USER) {
                logger.info('From-me:', emailInfos.message);
            } else {
                commands
                    .getCommand(emailInfos.message)
                    .then(commandData => {
                        switch (commandData.command) {
                            case COMMANDS.DEPOY_PR:
                            case COMMANDS.DEPLOY_AND_MERGE:
                            case COMMANDS.DEPLOY_AND_MERGE_WITH_CONFIG:
                                deploy.deploy(emailInfos, data.compiledPhpMyAdminConfig);
                                break;
                            case COMMANDS.DEPLOY_WITH_CONFIG:
                                deploy.deploy(
                                    emailInfos,
                                    data.protectConfig(data.getDataFromConfig(commandData.options.configBlock).trim())
                                );
                                break;
                            case COMMANDS.DO_NOTHING:
                                // No nothing
                                break;
                            default:
                                logger.warn('Unhandled action', commandData, COMMANDS, emailInfos);
                                break;
                        }
                    })
                    .catch(error => logger.error(error));
            }
        });
    })
    .catch(error => logger.error(error));

module.exports = {
    mail: mail,
};
