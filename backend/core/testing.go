package core

// JSON-stringified private keys.
var fakeUsers = map[string]struct {
	Account string
	Device  string
}{
	"alice": {
		Account: `"CAESQPp+QNO5NNWKgfAx1wgAj+iOISKrENspgGZzvDsnR3y46s9aB771DRwM6ovuJppSNu+5mwyQM0GPrDClxyL+GWA="`,
		Device:  `"CAESQNXo6/umWsQoXAZ13REtd0BesPr2paY4SEhjaA9UuzEWUkE+/Tte18OgQqqbZzip9yaQ1ePQ8Wm6jJUr2pFFMoc="`,
	},
	"bob": {
		Account: `"CAESQO89km7Cis1PMBoBV3MHx3JNO4XdtN5a+y+OgIL4klX3QEmTQlKDerpf6r90ERxIlUaPTX9uPb5fQwJbUsZX228="`,
		Device:  `"CAESQNHDw1Cp9rFiOdKfyrx+wBVzTcv9upV18O2s5CJO1fCJ10ROWmNXYFYiSnht8y7/yasNerO2fOObm+kNcxI9Sus="`,
	},
	"carol": {
		Account: `"CAESQBDN9IeKt2dZu5KbT3+U4LKdOavRGl2gE3HnWlRhxzBTmjYh916I2c8+j67TeHpO1RPjB4rqFszswTCWDIVvh3U="`,
		Device:  `"CAESQKqxw/q2HruIc7BxBygaoYoE3Nq0DCGSFMYQqOtpdn5SMR1H6HqnKMSgbCWC77Lldo5ODsqurRr48D1pfQxPPD0="`,
	},
	"derek": {
		Account: `"CAESQAmQsZC/oEbMLxv9ajRBpdcSinMfhfIeDKqFP3WlWs3jHguezw8JydB/vFIFPiyAUCRLCM5zgiO9ds0GXx1C518="`,
		Device:  `"CAESQNW0CDuhSw9c1F7hUlELIMg+Lr5peQ6wa8NxmbDGo9fiTy7X5IWZDo40cxVJynnM3zV1pOH4aueXtPZriePUYow="`,
	},
}
