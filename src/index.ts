'use strict';

import logger from '@src/logger';
import deploy from '@src/deploy';
import { default as commands, COMMANDS, commandData } from '@src/commands';
import mail from '@src/mail';
import data, { emailData } from '@src/data';
import github, { reactions } from './github';
import Knex from '@src/knex';
import User from './modeles/User';
import Message, { MessagePlatform } from './modeles/Message';

logger.debug('Connect to database');
Knex.getConnection();

const processCommand = (commandData: commandData, emailInfos: emailData) => {
    switch (commandData.command) {
        case COMMANDS.DEPLOY_PR:
        case COMMANDS.DEPLOY_AND_MERGE:
        case COMMANDS.DEPLOY_AND_MERGE_WITH_CONFIG:
            github.addReaction(emailInfos.commentId || 0, emailInfos.repoName, reactions.UPVOTE);
            deploy.deploy(emailInfos, data.compiledPhpMyAdminConfig);
            break;
        case COMMANDS.DEPLOY_WITH_CONFIG:
            github.addReaction(emailInfos.commentId || 0, emailInfos.repoName, reactions.UPVOTE);
            let configData: string = data.getDataFromConfig(commandData.options.configBlock) || '';
            deploy.deploy(emailInfos, data.protectConfig(configData.trim()));
            break;
        case COMMANDS.DO_NOTHING:
            // No nothing
            break;
        default:
            github.addReaction(emailInfos.commentId || 0, emailInfos.repoName, reactions.CONFUSED);
            logger.warn('Unhandled action', commandData, COMMANDS, emailInfos);
            break;
    }
};

User.getConfirmedUsernames()
    .then(allowedUsernames => {
        logger.info('Allowed usernames: ', allowedUsernames);
        logger.debug('Training...');
        commands
            .train()
            .then(() => {
                logger.debug('End of training');
                new mail(emailInfos => {
                    logger.debug('New email', emailInfos);
                    if (emailInfos.requestedByUser === process.env.ROBOT_USER) {
                        logger.info('From-me:', emailInfos.message);
                    } else if (allowedUsernames.includes(emailInfos.requestedByUser)) {
                        if (emailInfos.commentId !== null && emailInfos.prId !== null) {
                            const msg = new Message(
                                emailInfos.requestedByUser,
                                emailInfos.commentId,
                                emailInfos.prId,
                                MessagePlatform.github,
                                false
                            );
                            msg.save();
                        }
                        commands
                            .getCommand(emailInfos.message)
                            .then(commandData => processCommand(commandData, emailInfos))
                            .catch((error: Error) => logger.error(error));
                    } else {
                        logger.info('Not allowed:', emailInfos.requestedByUser);
                    }
                });
            })
            .catch((error: Error) => logger.error(error));
    })
    .catch((error: Error) => logger.error(error));
