// transform declaration registry into typescript declarations
import * as Declaration from './registry'

function stringifyParameters(parameters: Declaration.Parameter[]): string {
	return parameters.map(
		({name,typename}) => `${name}: ${typename}`
	).join(', ')
}

function declarationForFunction(func: Declaration.Function): string {
	const {name,parameters,returnType} = func
	const parametersString: string = stringifyParameters(parameters)
	return `${name}(${parametersString}): ${returnType};`
}

/*
// identical
const getEnumInterfaceDeclaration = 
		(module: EmscriptenModule, registry: Registry) => 
		(enumInfo: EnumInfo) => 
{
	const {getName,values} = enumInfo;
	const name = getName(module)
	return `\t${name}: ${name}Enum`
}

const getEnumValueDeclaration = 
		(
			module: EmscriptenModule, registry: Registry,
			enumName: string
		) => (valInfo: EnumValueInfo) => {
	const {name,enumValue} = valInfo;
	const humanName = readLatin1String(module)(name)
	return `\t${humanName}: ${enumName},`
}

const getEnumDeclaration = 
		(module: EmscriptenModule,registry: Registry) => 
		(enumInfo: EnumInfo) => 
{
	const {getName,values} = enumInfo;
	const name = getName(module)
	return [
		`declare const valid${name}: unique symbol;`,
		`export interface ${name} {[valid${name}]: true}`,
		`interface ${name}Enum {`,
		...enumInfo.values.map(
			getEnumValueDeclaration(module,registry,name)),
		'}'
	].join('\n')
}
*/

// TS is not responsible for enforcing number sizes (int8 vs int32 etc)
function declarationForNumber(name: string) {
	return `type ${name} = number;`
}

const staticName = (originalName: string) => `${originalName}Class`

// standalone declaration for class. used for typing
function memberDeclarationForClass(cppclass: Declaration.Class) {
	return [
		`export interface ${cppclass.name} {`,

		'}'
	].join('\n')
}

const declarationForConstructor =
		(cppclass: Declaration.Class) =>
		(constructor: Declaration.Constructor): string => 
{
	const params = stringifyParameters(constructor.parameters)
	const {name} = cppclass
	return `new (${params}): ${name};`
}

// static declaration for class. used to define type used for access
function staticDeclarationForClass(cppclass: Declaration.Class): string {
	const classname = staticName(cppclass.name)
	return [
		`interface ${classname} {`,
		...cppclass.staticFunctions.map(declarationForFunction).map(indent),
		...cppclass.constructors
			.map(declarationForConstructor(cppclass)).map(indent),
		'}'
	].join('\n')
}

function declarationForClass(cppclass: Declaration.Class): string {
	return [
		memberDeclarationForClass(cppclass),
		staticDeclarationForClass(cppclass)
	].join('\n')
}

// module declaration for class. used for access
function moduleDeclarationForClass(cppclass: Declaration.Class) {
	const {name} = cppclass
	const staticClassName = staticName(name)
	return `${name}: ${staticClassName}`
}

const indent = (text: string) => `\t${text}`

function declarationForModule(
		registry: Declaration.Registry
) {
	const lines = [
		"export interface CustomEmbindModule {",
		...registry.functions.map(declarationForFunction).map(indent),
		/*
		...Object.values(registry.classes)
			.map(getClassModuleDeclaration(module,registry))
			.map(indent),
		...Object.values(registry.enums)
			.map(getEnumInterfaceDeclaration(module,registry)),
		*/
		...registry.classes.map(moduleDeclarationForClass).map(indent),
		"}",
		"declare function factory(): Promise<CustomEmbindModule>;",
		"export default factory;"
	]
	return lines.join('\n')
}

export function declarationsForRegistry(
		registry: Declaration.Registry
): string {
	return [
		'// generated by TSEMBIND',
		'',
		'// define type aliases for various native number types',
		...registry.numbers.map(declarationForNumber),
		'',
		/*Object.values(registry.classes)
			.map(getClassExternalDeclaration(module,registry)),
		Object.values(registry.enums)
			.map(getEnumDeclaration(module,registry)),*/
		...registry.classes.map(declarationForClass),
		declarationForModule(registry)
	].join('\n')
}

module.exports = {declarationsForRegistry}
