import Base from '../../../node_modules/neo.mjs/src/core/Base.mjs';

/**
 * This class contains a CPU-intensive task to be run in a dedicated Task Worker.
 * @class BigData.task.Helper
 * @extends Neo.core.Base
 * @singleton
 */
class Helper extends Base {
    static config = {
        /**
         * @member {String} className='BigData.task.Helper'
         * @protected
         */
        className: 'BigData.task.Helper',
        /**
         * @member {Boolean} singleton=true
         * @protected
         */
        singleton: true,
        /**
         * @member {Object} remote
         * @protected
         */
        remote: {
            app: [
                'generateGridData'
            ]
        }
    }

    firstnames = [
        'Amanda', 'Andrew', 'Anthony', 'Ashley', 'Barbara', 'Betty', 'Brian', 'Carol', 'Charles', 'Christopher',
        'Daniel', 'David', 'Deborah', 'Donna', 'Elizabeth', 'Emily', 'George', 'Jack', 'James', 'Jennifer',
        'Jessica', 'Joe', 'John', 'Joseph', 'Joshua', 'Karen', 'Kenneth', 'Kelly', 'Kevin', 'Kimberly',
        'Linda', 'Lisa', 'Margaret', 'Mark', 'Mary', 'Matthew', 'Max', 'Melissa', 'Michael', 'Michelle',
        'Nancy', 'Patricia', 'Paul', 'Richard', 'Robert', 'Ronald', 'Sam', 'Sandra', 'Sarah', 'Stephanie',
        'Steven', 'Susan', 'Thomas', 'Timothy', 'Tobias', 'William'
    ]

    lastnames = [
        'Adams', 'Allen', 'Anderson', 'Baker', 'Brown', 'Campbell', 'Carter', 'Clark', 'Davis', 'Flores',
        'Garcia', 'Gonzales', 'Green', 'Hall', 'Harris', 'Hernandez', 'Hill', 'Jackson', 'Johnson', 'Jones',
        'King', 'Lee', 'Lewis', 'Lopez', 'Martin', 'Martinez', 'Miller', 'Mitchell', 'Moore', 'Nelson',
        'Nguyen', 'Perez', 'Rahder', 'Ramirez', 'Roberts', 'Rivera', 'Robinson', 'Rodriguez', 'Sanchez', 'Scott',
        'Smith', 'Taylor', 'Thomas', 'Thompson', 'Torres', 'Uhlig', 'Walker', 'Waters', 'White', 'Williams',
        'Wilson', 'Wright', 'Young'
    ]

    /**
     * Creates random data matching the passed columns & rows range.
     * @param {Object} data
     * @param {Number} data.amountColumns
     * @param {Number} data.amountRows
     * @returns {Object[]} The objects to add to the grid store
     */
    generateGridData({amountColumns, amountRows}) {
        let me               = this,
            amountFirstnames = me.firstnames.length,
            amountLastnames  = me.lastnames.length,
            records          = [],
            row              = 0,
            column, record;

        for (; row < amountRows; row++) {
            column = 7;
            record = {
                id       : row + 1,
                counter  : Math.round(Math.random() * 100),
                firstname: me.firstnames[Math.floor(Math.random() * amountFirstnames)],
                lastname : me.lastnames[ Math.floor(Math.random() * amountLastnames)],
                progress : Math.round(Math.random() * 100)
            };

            for (; column <= amountColumns; column++) {
                record['number' + column] = Math.round(Math.random() * 10000)
            }

            records.push(record)
        }

        return records
    }
}

export default Neo.setupClass(Helper);
