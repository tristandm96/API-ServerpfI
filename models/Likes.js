import Model from './model.js';

export default class Like extends Model {
    constructor() {
        super(true);
        this.addField('PostId', 'string');
        this.addField('Total','integer')
        this.addField('UsersId','array')
    }
}
