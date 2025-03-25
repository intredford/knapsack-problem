// Обработчик сообщений веб-воркеру:
self.onmessage = function(e) {
	const { backpacks, items, properties, config } = e.data
	const start = performance.now()
	
	const solvedBackpacks = solve(backpacks, items, properties, config)
	
	const timeElapsed = performance.now() - start
	self.postMessage({ backpacks: solvedBackpacks, timeElapsed })
}

// Главная функция для расчёта решения:
function solve(backpacks, items, properties, config) {

	// Мапа для отслеживания остатков.
	const remainingStock = new Map(
		items.map(item => [item.name, config.stock ? item.stock : Infinity])
	)

	// Определяем, какое свойство нужно максимизировать.
	const maximizedPropertyIndex = properties.findIndex(p => p.maximize)

	// Кэш заполненных рюкзаков.
	const backpacksCache = []

	// Идём по рюкзакам:
	for (let [index, backpack] of backpacks.entries()) {

		// Если остатки отключены и рюкзак идентичен какому-либо из предыдущих,
		// то просто копируем заполнение предыдущего.
		if (!config.stock) {
			const restrictions = JSON.stringify(backpack.restrictions)
			const identical = backpacksCache.find(b => JSON.stringify(b.restrictions) === restrictions)
			console.log(backpacksCache, restrictions, identical)
			if (identical) {
				backpacks[index] = structuredClone(identical)
				continue
			}
		}

		// Инициализация.
		backpack.items = null
		let bestValue = 0
		let bestCombination = []
		let bestSums = {}

		// Убираем снятые ограничения.
		backpack.allRestrictions = backpack.restrictions
		backpack.restrictions = backpack.restrictions.filter(restriction => restriction.enabled)

		// Расчитываем "ценность" предметов.
		const itemEfficiencies = items
			.filter(item => remainingStock.get(item.name) > 0)
			.map(item => {
				const prioritizedPropValue = item.properties[maximizedPropertyIndex].value
				const restrictions = backpack.restrictions.map((r, rIndex) => {
					const prop = item.properties[rIndex]
					return prop ? prop.value / r.value : 0
				})
				return {
					item,
					efficiency: prioritizedPropValue / Math.max(...restrictions),
					maxQuantity: remainingStock.get(item.name)
				}
			})
			.sort((a, b) => b.efficiency - a.efficiency)

		// Функция для вычисления лучшей комбинации:
		const getBestCombination = (depth, combination, propertySums) => {
			// Проверяем потенциал оставшейся ветки
			const remainingValue = itemEfficiencies.slice(depth).reduce((sum, {item, efficiency, maxQuantity}) => 
				sum + efficiency * maxQuantity, 0)

			const entries = Object.entries(propertySums)
			const maximizedValue = entries.length ? entries[maximizedPropertyIndex][1] : 0
			
			if (maximizedValue + remainingValue <= bestValue) {
				return
			}
	
			// Обновляем лучший результат, если нашли
			if (maximizedValue > bestValue) {
				bestValue = maximizedValue
				bestCombination = combination.map(item => ({...item}))
				bestSums = {...propertySums}
			}
	
			// Пробуем добавить ещё предметы
			for (let i = itemEfficiencies.length - 1; i >= depth; i--) {
				const { item, maxQuantity } = itemEfficiencies[i]
				
				const newCombination = combination.map(item => ({...item}))
				const existingItem = newCombination.find(i => i.name === item.name)
				
				// Если предмет исчерпан — пропускаем.
				if (existingItem && existingItem.quantity >= maxQuantity) {
					continue
				}
	
				// Находим максимально возможное количество предметов
				let maxPossibleQuantity = maxQuantity - (existingItem?.quantity || 0)
				for (const prop of item.properties) {
					const restriction = backpack.restrictions.find(r => r.property === prop.name)
					if (restriction) {
						const remaining = restriction.value - (propertySums[prop.name] || 0)
						const possibleByProp = Math.floor(remaining / prop.value)
						maxPossibleQuantity = Math.min(maxPossibleQuantity, possibleByProp)
					}
				}
	
				if (maxPossibleQuantity <= 0) continue
	
				// Бинарный поиск оптимального количества
				let left = 1;
				let right = maxPossibleQuantity;
	
				while (left <= right) {
					const mid = Math.floor((left + right) / 2);
					const newSums = {...propertySums};
					let canAdd = true;
	
					// Проверяем возможность добавления mid предметов
					for (const [propIndex, prop] of item.properties.entries()) {
						const newSum = (newSums[prop.name] || 0) + prop.value * mid;
						const restriction = backpack.allRestrictions[propIndex];
						if (restriction.enabled && newSum > restriction.value) {
							canAdd = false;
							break;
						}
						newSums[prop.name] = newSum;
					}
	
					if (canAdd) {
						// Если можем добавить mid предметов, пробуем больше
						const nextCombination = newCombination.map(item => ({...item}));
						if (existingItem) {
							existingItem.quantity += mid;
						} else {
							nextCombination.push({ name: item.name, quantity: mid });
						}
						
						getBestCombination(i + 1, nextCombination, newSums);
						left = mid + 1;
					} else {
						// Если не можем, пробуем меньше
						right = mid - 1;
					}
				}
			}
		}

		// Запускаем заполнение рюкзака.
		getBestCombination(0, [], {})
			
		// Устанавливаем полученные поля.
		backpack.items = bestCombination
		backpack.propertySums = bestSums
		backpack.restrictions = backpack.allRestrictions
		delete backpack.allRestrictions

		// Кешируем заполнение рюкзака, если остатки отключены.
		if (!config.stock) {
			backpacksCache.push(backpack)
		}

		// Обновляем оставшееся количество предметов.
		if (config.stock) {
			for (const item of bestCombination) {
				const currentStock = remainingStock.get(item.name)
				remainingStock.set(item.name, currentStock - item.quantity)
			}
		}
	}

	return backpacks
}