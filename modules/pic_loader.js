export default class PicLoader {
    /**
     * コンストラクタ
     * メモリ領域の取得，レジスタの配置，命令セットの定義
     */
    constructor() {

        this.SIZE_OF_X = 512;
        this.SIZE_OF_Y = 512;
        
        this.SIZE_OF_BUFF = 2048;






        /**
         * 命令を実行することによって変更されるレジスタ・メモリ
         */
        this.changes = {};
        this.changes[ "register" ] = {};
        this.change_all = {};
        this.change_all[ "register" ] = {};

        // 命令の定義
        // 命令はinstructions (連想配列) に代入される
        this.instructions = this.define_instructions();

        /**
         * ブレークポイント
         * @type {Array<Number>}
         */
        this.break_points = [];

        /** デバッグ時にtrueにする */
        this.debug = false;
    }
    

}
class ColorCache {
    constructor() {
        this.color = null;
        this.next = null;
        this.prev = null;
    }
}
/**
 * 未定義命令エラー
 */
class UnasignedInstructionError extends Error {
    constructor(...params) {
        super(...params);
        if(Error.captureStackTrace) {
            Error.captureStackTrace(this, UnasignedInstructionError)
        }
        this.name = 'UnasignedInstructionError';
    }
}

/**
 * 未定義実行時フラグエラー
 */
class UnasignedFlagError extends Error {
    constructor(...params) {
        super(...params);
        if(Error.captureStackTrace) {
            Error.captureStackTrace(this, UnasignedFlagError)
        }
        this.name = 'UnasignedFlagError';
    }
}

/**
 * レジスタエラー
 */
class IllegalRegisterError extends Error {
    constructor(...params) {
        super(...params);
        if(Error.captureStackTrace) {
            Error.captureStackTrace(this, IllegalRegisterError)
        }
        this.name = 'IllegalRegisterError';
    }
}
console.log("start");
let x = new nlp16();
let cpu;
let first_break = true;

let bin = document.querySelector('#bin');
let text = document.querySelector('#text');
let reset = document.querySelector('#reset');
let next = document.querySelector('#next');
let runto = document.querySelector('#runto');
let con = document.querySelector('#console_main');
let executable_bin;
let size;
let mem;
//let mem_addr, mem_data;
let old_addr = [ 0, 0 ];

bin.addEventListener('change', async(ev) => {
    let file = bin.files[0];
    let reader = new FileReader();
    size = file.size;
    let data = new ArrayBuffer(size);

    reader.addEventListener('load',() => {
        executable_bin = reader.result;
        mem = new Uint16Array(executable_bin);
        console.log( mem );
        x.load_binary( 0, mem, size );
        //mem_addr = document.querySelectorAll('.address');
        //mem_data = document.querySelectorAll('.mem_value');
    });
    reader.readAsArrayBuffer(file);
});

text.addEventListener('change', async(ev) => {
    let file = text.files[0];
    let reader = new FileReader();
    reader.addEventListener('load', () => {
        let lines = reader.result.split('\n');
        mem = new Uint16Array( lines.length );
        let address = 0;
        for( let word of lines ) {
            mem[address] = parseInt(word, 16) & 0xffff;
            address++;
        }
        console.log(mem);
        x.load_binary( 0, mem, lines.length );
        set_memory( 0, mem, lines.length );
        console.log( x.memory );
        //mem_addr = document.querySelectorAll('.address');
        //mem_data = document.querySelectorAll('.mem_value');
    });
    reader.readAsText( file );
});

reset.addEventListener('click', () => {
    cpu = x.web_run( 0 );
    let addresses = document.querySelectorAll('.address');
    for( let add of addresses ) {
        add.addEventListener('click', (ev) => {
            ev.target.classList.add('breakpoint');
            x.add_break_point( parseInt( ev.target.innerText, 16 ) );
        });
    }
    first_break = true;
    //x.add_break_point( 0x06 );
});

next.addEventListener('click', () => {
    let result1, result2;
    try {
        result1 = cpu.next( "step" );
        console.log( {result1} );
        result2 = cpu.next( "step" );
        console.log( {result2} );
        //console.log( {result1, result2});
        document.querySelector('#reg_0').innerText = padding(result1.value.ir1);
        document.querySelector('#reg_1').innerText = padding(result1.value.ir2);
        document.querySelector('#reg_2').innerText = padding(result1.value.ir3);
        document.querySelector('#reg_13').innerText = padding(result1.value.ip);
        let ip = result1.value.ip;
        let ip_count = result1.value.ip_count;
        let memory_view = document.querySelector('#memory_view1');
        for( let add = old_addr[0]; add<old_addr[0]+old_addr[1]; add++ ) {
            memory_view.querySelector(`tr:nth-child(${add+1})`).classList.remove('exec');
        }
        old_addr = [ ip, ip_count ];
        for( let add = ip; add<ip + ip_count; add++ ) {
            memory_view.querySelector(`tr:nth-child(${add+1})`).classList.add('exec');
        }
        if( "register" in result2.value ) {
            for( let elm of document.querySelectorAll('.reg_value') ) {
                elm.classList.remove('exec');
            }
            for( let [number, reg] of Object.entries(result2.value["register"]) ) {
                let reg_element = document.querySelector('#reg_'+reg.id );
                reg_element.innerText = padding( reg.to );
                reg_element.classList.add('exec');
                if( reg.id == 9 ) {
                    con.innerText += String.fromCharCode( reg.to );
                }
            }
        }
        if( "flag" in result2.value ) {
            let flag = result2.value["flag"]["to"];
            if( flag & 8 ){

                document.querySelector('#flag_s').classList.add('indicator_on');
            } 
            else {
                document.querySelector('#flag_s').classList.remove('indicator_on');
            }
            if( flag & 4 ) document.querySelector('#flag_z').classList.add('indicator_on');
            else document.querySelector('#flag_z').classList.remove('indicator_on');
            if( flag & 2 ) document.querySelector('#flag_v').classList.add('indicator_on');
            else document.querySelector('#flag_v').classList.remove('indicator_on');
            if( flag & 1 ) document.querySelector('#flag_c').classList.add('indicator_on');
            else document.querySelector('#flag_c').classList.remove('indicator_on');
        }
    } catch( err ) {
        console.log( err );
        console.log( {result1, result2 });
        document.querySelector('#terminate').classList.remove('normal');
        document.querySelector('#terminate').classList.add('terminate');
        document.querySelector('#reason').innerText = err.message;
    }
});

runto.addEventListener('click', () => {
    let result1, result2;
    try {
        if( first_break ) {
            result1 = cpu.next( "break" );
            first_break = false;
            console.log( {result1} );
        }
        result2 = cpu.next( "break" );
        console.log( {result2} );
        //console.log( {result1, result2});
        document.querySelector('#reg_0').innerText = padding(result2.value.ir1);
        document.querySelector('#reg_1').innerText = padding(result2.value.ir2);
        document.querySelector('#reg_2').innerText = padding(result2.value.ir3);
        document.querySelector('#reg_13').innerText = padding(result2.value.ip);
        let ip = result2.value.ip;
        let ip_count = result2.value.ip_count;
        let memory_view = document.querySelector('#memory_view1');
        for( let add = old_addr[0]; add<old_addr[0]+old_addr[1]; add++ ) {
            memory_view.querySelector(`tr:nth-child(${add+1})`).classList.remove('exec');
        }
        old_addr = [ ip, ip_count ];
        for( let add = ip; add<ip + ip_count; add++ ) {
            memory_view.querySelector(`tr:nth-child(${add+1})`).classList.add('exec');
        }
        if( "register" in result2.value.chall ) {
            for( let elm of document.querySelectorAll('.reg_value') ) {
                elm.classList.remove('exec');
            }
            for( let [number, reg] of Object.entries(result2.value.chall["register"]) ) {
                let reg_element = document.querySelector('#reg_'+reg.id );
                reg_element.innerText = padding( reg.to );
                reg_element.classList.add('exec');
                if( reg.id == 9 ) {
                    con.innerText += String.fromCharCode( reg.to );
                }
            }
        }
        if( "flag" in result2.value.chall ) {
            let flag = result2.value.chall["flag"]["to"];
            if( flag & 8 ){

                document.querySelector('#flag_s').classList.add('indicator_on');
            }
            else {
                document.querySelector('#flag_s').classList.remove('indicator_on');
            }
            if( flag & 4 ) document.querySelector('#flag_z').classList.add('indicator_on');
            else document.querySelector('#flag_z').classList.remove('indicator_on');
            if( flag & 2 ) document.querySelector('#flag_v').classList.add('indicator_on');
            else document.querySelector('#flag_v').classList.remove('indicator_on');
            if( flag & 1 ) document.querySelector('#flag_c').classList.add('indicator_on');
            else document.querySelector('#flag_c').classList.remove('indicator_on');
        }
    } catch( err ) {
        console.log( err );
        console.log( {result2 });
        document.querySelector('#terminate').classList.remove('normal');
        document.querySelector('#terminate').classList.add('terminate');
        document.querySelector('#reason').innerText = err.message;
    }
});

function padding( number ) {
    if( number )
        return ('000' + number.toString(16)).slice(-4);
    else if( number == 0 )  return '0000';
    else return '----';
}

function set_memory( address, mem, length ) {
    let memory = document.querySelector('#memory_view1');

    for( let i=0; i<length; i++ ) {
        let tr = document.createElement('tr');
        let td1 = document.createElement('td');
        td1.classList.add('address');
        td1.innerText = padding( address+i );
        let td2 = document.createElement('td');
        td2.classList.add('mem_value');
        td2.innerText = padding(mem[i]);
        tr.appendChild(td1);
        tr.appendChild(td2);
        memory.appendChild(tr);
    }
}