import { createApp } from './petite-vue.js'
createApp({

	properties: [
		{ name: 'Площадь' },
		{ name: 'Цена' },
		{ name: 'Изделий за смену', maximize: true }
	],
	items: [
		{
			name: 'Станок I типа',
			properties: [
				{ name: 'Площадь', value: 12 },
				{ name: 'Цена', value: 60000 },
				{ name: 'Изделий за смену', value: 70 }
			],
			stock: 3
		}, {
			name: 'Станок II типа',
			properties: [
				{ name: 'Площадь', value: 6 },
				{ name: 'Цена', value: 40000 },
				{ name: 'Изделий за смену', value: 40 }
			],
			stock: 5
		}
	],
	backpacks: [
		{
			restrictions: [
				{ property: 'Площадь', value: 74, enabled: true },
				{ property: 'Цена', value: 420000, enabled: true },
				{ property: 'Изделий за смену', value: 0, enabled: false }
			], items: []
		}
	],
	config: {
		stock: false,
		pause: false,
		debug: false
	},
	worker: null,
	computing: false,
	timeElapsed: null,
	solution: null,

	addProperty() {
		this.properties.push({ name: '' })
		this.items.forEach(item => {
			item.properties.push({ name: '', value: 0 })
		})
		this.backpacks.forEach(backpack => {
			backpack.restrictions.push({ property: "", value: 0, enabled: false })
		})
		queueMicrotask(() => {
			document.querySelector('.properties').lastElementChild.querySelector('input[type="text"]').focus()
			this.solve()
		})
	},

	updateProperty(index) {
		const name = this.properties[index].name
		if (/^\d/.test(name)) {
			this.properties[index].error = 'Не должно начинаться с цифры'
			return
		} else {
			delete this.properties[index].error
		}
		this.items.forEach(item => {
			item.properties[index].name = name
		})
		this.backpacks.forEach(backpack => {
			backpack.restrictions[index].property = name
		})
		this.solution?.forEach(backpack => {
			backpack.restrictions[index].property = name
			backpack.propertySums = Object.fromEntries(
				Object.entries(backpack.propertySums).map(([key, value], i) => { 
					return [ (i===index ? name : key), value ]
				}
			)) 
		})
	},

	deleteProperty(index) {
		this.properties.splice(index, 1)
		this.items.forEach(item => {
			item.properties.splice(index, 1)
		})
		this.backpacks.forEach(backpack => {
			backpack.restrictions.splice(index, 1)
			console.log(backpack.restrictions)
		})
		this.solve()
	},

	addItem() {
		this.items.push({
			name: 'Новый',
			...JSON.parse(JSON.stringify(this.items.at(-1))),
		})
		queueMicrotask(() => {
			document.querySelector('.item:last-of-type').querySelector('input[type="text"]').focus()
			this.solve()
		})
	},

	deleteItem(index) {
		if (this.items.length > 1) {
			this.items.splice(index, 1)
		} else {
			this.items[0].properties.forEach(property => property.value = 0)
		}
		this.solve()
	},

	addBackpack() {
		this.backpacks.push(JSON.parse(JSON.stringify(this.backpacks.at(-1))))
		this.solve()
	},

	deleteBackpack(index) {
		if (this.backpacks.length > 1) {
			this.backpacks.splice(index, 1)
		} else {
			this.backpacks[0].restrictions.forEach(restriction => restriction.value = 0)
		}
		this.solve()
	},

	get filledBackpacks() {
		return this.solution || this.backpacks;
	},

	solve() {
		if (!this.computing && !this.config.pause && this.worker) {
			this.worker.terminate()
			this.initWorker()
			this.computing = true
			const clone = (obj) => JSON.parse(JSON.stringify(obj))
			this.worker.postMessage({
				backpacks: clone(this.backpacks),
				items: clone(this.items),
				properties: clone(this.properties),
				config: clone(this.config)
			})
		}
	},

	showInfo() {
		alert(`
			Эта страница — проект по Прикладной математике за 2 курс.
			
			На ней находится интерфейс для ввода произвольных параметров задачи мультипликативного (не)ограниченного n-мерного рюкзака. Внизу отображается результат решения задачи.

			Простыми словами, «задача о рюкзаке» состоит в том, чтобы уложить как можно большее число вещей в рюкзак ограниченной вместимости.
			________________________________________________

			Дмитрий передаёт привет Екатерине Лутковской и Елене Волоховой. 2024/2025.
		`.replaceAll("\t", "").trim()) 
	},
	
	pretty(int) {
		return int.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
	},

	initWorker() {
		this.worker = new Worker('./js/worker.js')
		this.worker.onmessage = (e) => {
			const { backpacks, timeElapsed } = e.data
			this.solution = backpacks;
			this.computing = false
			this.timeElapsed = timeElapsed
			console.log('Решено за', timeElapsed, 'мс')
		}
	},

	mounted() {
		this.initWorker()
		this.solve()
	}

}).mount()