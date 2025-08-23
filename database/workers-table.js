import { Model, DataTypes } from "sequelize";
import { sequelize } from './sequelize.js';
import { logger } from '../logger/index.js';

class Worker extends Model {}

Worker.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    chat_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    dialoguestatus: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: ''
    }
}, {
    freezeTableName: false,
    timestamps: false,
    modelName: 'workers',
    sequelize
});

const createNewWorkerByChatId = async (chat_id) => {
    let res;
    try {
        res = await Worker.create({ chat_id });
        res = res.dataValues;
        logger.info(`Created new worker with chat ID: ${chat_id}`);
    } catch (err) {
        logger.error(`Impossible to create worker: ${err}. Chat id ${chat_id}`);
    }
    return res;
};

const updateWorkerByChatId = async (chat_id, updateParams) => {
    try {
        const res = await Worker.update({ ...updateParams }, { where: { chat_id } });
        if (res[0]) {
            const data = await findWorkerByChatId(chat_id);
            if (data) {
                logger.info(`Worker ${chat_id} updated successfully`);
                return data;
            }
            logger.info(`User ${chat_id} updated, but can't read result data`);
        }
    } catch (error) {
        logger.error(`Error updating worker ${chat_id}: ${error.message}`);
    }
    return undefined;
};

const findWorkerByChatId = async (chat_id) => {
    try {
        const res = await Worker.findOne({ where: { chat_id: chat_id } });
        if (res) return res.dataValues;
        return res;
    } catch (error) {
        logger.error(`Error finding worker by chat ID ${chat_id}: ${error.message}`);
        return null;
    }
};

const getAllWorkers = async () => {
    try {
        const workers = await Worker.findAll({
            order: [['id', 'ASC']]
        });
        return workers.map(worker => worker.dataValues);
    } catch (error) {
        logger.error(`Error getting all workers: ${error.message}`);
        return [];
    }
};

const getActiveWorkers = async () => {
    try {
        const workers = await Worker.findAll({
            where: {
                chat_id: {
                    [sequelize.Sequelize.Op.not]: null
                }
            },
            order: [['id', 'ASC']]
        });
        return workers.map(worker => worker.dataValues);
    } catch (error) {
        logger.error(`Error getting active workers: ${error.message}`);
        return [];
    }
};

export {
    Worker,
    createNewWorkerByChatId,
    updateWorkerByChatId,
    findWorkerByChatId,
    getAllWorkers,
    getActiveWorkers
};
