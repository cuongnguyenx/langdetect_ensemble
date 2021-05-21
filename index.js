var franc_min = require('franc-min')
var franc = require('franc')
var franc_all = require('franc-all')
var franc_in_use = null;
var path = require('path')
var fastText = require('fasttext');
var langs = require('langs')
var _ = require('lodash')
var fs = require('fs')


class langDetect {    
    constructor(models = [], weights = [], franc_opt = 'franc-min') {
        this.models = models;
        this.modelNums = models.length + 1;
        if (franc_opt == 'franc-all') {
            franc_in_use = franc_all
        }
        else if (franc_opt = 'franc') {
            franc_in_use = franc
        }
        else {
            franc_in_use = franc_min
        }
        if (weights.length != this.modelNums) {
            this.weights = Array(this.modelNums).fill(1/this.modelNums)
        }
    }

    // FastText models only
    addModel(filePath) {
        const model = path.resolve('', filePath)
        this.models.push(new fastText.Classifier(model))
        this.modelNums += 1
        
        if (this.weights.length != this.modelNums) {
            this.weights = Array(this.modelNums).fill(1/(this.modelNums))
        }
    }
    
    // Add all models from the specified folder
    addModelFromFolder(folderPath) {
        let _this = this
        fs.readdirSync(folderPath).forEach(function(file) {
        let model_file = folderPath +'/'+file;
        try {
            _this.langDet.addModel(model_file)
        } catch (error) {
            console.log(error);
        }
        });
    }

    
    setWeights(newWeights) {
        if (newWeights.length == this.modelNums) {
            this.weights = newWeights
        }
    }

    async predict_helper(i, input) {
        let tag = ""
        const res = await this.models[i].predict(input)
        if (res.length > 0) {
            tag = res[0].label.replace("__label__", "");
            tag = langs.where('1', tag)['2']
            return Promise.resolve(tag)
        }
    }
    
    async predict(input, idxToUse = Array.from({length: this.modelNums - 1}, (x, i) => i)) {
        let langArr = []
        let self = this
        langArr.push(franc(input))
    
        // Iterate through FastText models
        for (const i of idxToUse) {
            const lang_pred = await this.predict_helper(i, input)
            langArr.push(lang_pred)
        }
    
        let scoreDict = {}
    
        let cnt = 0;
        for (const lang of langArr) {
            if (!scoreDict.hasOwnProperty(lang)) {
                scoreDict[lang] = 1 * this.weights[cnt]
            }
            else {
                scoreDict[lang] += 1 * this.weights[cnt]
            }
            cnt++
        }
        
        console.log(langArr)
        let res = _.maxBy(_.keys(scoreDict), function (o) { return scoreDict[o]; });
        return res
    }
}

module.exports.langDetect = langDetect

